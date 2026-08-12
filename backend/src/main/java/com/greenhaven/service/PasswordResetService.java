package com.greenhaven.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.greenhaven.entity.AppUser;
import com.greenhaven.entity.PasswordReset;
import com.greenhaven.repository.AppUserRepository;
import com.greenhaven.repository.PasswordResetRepository;

@Service
public class PasswordResetService {
    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);

    private static final int TOKEN_BYTES = 32;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final AppUserRepository users;
    private final PasswordResetRepository resets;
    private final PasswordEncoder encoder;
    private final Duration lifetime;
    private final boolean exposeToken;

    public PasswordResetService(AppUserRepository users, PasswordResetRepository resets,
                                PasswordEncoder encoder,
                                @Value("${greenhaven.auth.reset-minutes:60}") int minutes,
                                @Value("${greenhaven.auth.expose-reset-token:false}") boolean exposeToken) {
        this.users = users;
        this.resets = resets;
        this.encoder = encoder;
        this.lifetime = Duration.ofMinutes(minutes);
        this.exposeToken = exposeToken;
    }

    @Transactional
    public Optional<String> request(String email, String ip) {
        String address = email == null ? "" : email.trim().toLowerCase();
        Optional<AppUser> found = users.findByEmail(address);

        if (found.isEmpty()) {
            log.info("Password reset requested for an address with no account.");
            return Optional.empty();
        }

        AppUser user = found.get();
        if (user.isBlocked()) {
            log.warn("Password reset requested for a suspended account.");
            return Optional.empty();
        }

        resets.markAllUsedFor(user.getId(), Instant.now());

        // Generate random reset token
        byte[] raw = new byte[TOKEN_BYTES];
        RANDOM.nextBytes(raw);
        String token = HexFormat.of().formatHex(raw);

        PasswordReset row = new PasswordReset();
        row.setUser(user);
        row.setTokenHash(sha256(token));
        row.setExpiresAt(Instant.now().plus(lifetime));
        row.setRequestedIp(ip);
        resets.save(row);

        if (!exposeToken) {
            log.info("Password reset token for {}: {}", user.getEmail(), token);
        }
        return exposeToken ? Optional.of(token) : Optional.empty();
    }

    @Transactional
    public void complete(String token, String newPassword, String confirmPassword) {
        if (newPassword == null || newPassword.length() < 8) {
            throw new IllegalArgumentException("Use at least 8 characters.");
        }
        if (!newPassword.equals(confirmPassword)) {
            throw new IllegalArgumentException("The two passwords do not match.");
        }

        // Match token by hash
        PasswordReset row = resets.findByTokenHash(sha256(token == null ? "" : token.trim()))
                .orElseThrow(() -> new IllegalArgumentException(
                        "That reset link is not valid. Request a new one."));

        if (row.getUsedAt() != null) {
            throw new IllegalArgumentException("That reset link has already been used.");
        }
        if (row.getExpiresAt().isBefore(Instant.now())) {
            throw new IllegalArgumentException("That reset link has expired. Request a new one.");
        }

        AppUser user = row.getUser();
        user.setPasswordHash(encoder.encode(newPassword));
        users.save(user);

        row.setUsedAt(Instant.now());
        resets.save(row);
        log.info("Password reset completed for user {}.", user.getId());
    }

    @Transactional(readOnly = true)
    public boolean isUsable(String token) {
        return resets.findByTokenHash(sha256(token == null ? "" : token.trim()))
                .filter(r -> r.getUsedAt() == null)
                .filter(r -> r.getExpiresAt().isAfter(Instant.now()))
                .isPresent();
    }

    private static String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("SHA-256 is unavailable.", e);
        }
    }
}
