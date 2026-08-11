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

import com.greenhaven.model.AppUser;
import com.greenhaven.model.PasswordReset;
import com.greenhaven.repository.AppUserRepository;
import com.greenhaven.repository.PasswordResetRepository;

/**
 * Forgotten passwords.
 *
 * Two rules shape everything here.
 *
 * The first: never reveal whether an address has an account. "No such user"
 * turns this endpoint into a free membership check, so the response is
 * identical either way and the work is simply skipped when there is nobody to
 * email.
 *
 * The second: the token is a temporary password, so only its SHA-256 is
 * stored. A leak of this table then grants nothing — the same reason the
 * password column holds a hash rather than a password.
 */
@Service
public class PasswordResetService {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);

    /** Long enough to be unguessable, short enough to paste from an email. */
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

    /**
     * Starts a reset. Returns the token ONLY when explicitly configured to.
     *
     * With no mail server connected there is otherwise no way to complete the
     * flow, but returning a reset token to whoever asks would let anyone take
     * any account. So it is off unless greenhaven.auth.expose-reset-token is
     * set, and the startup log says so loudly.
     */
    @Transactional
    public Optional<String> request(String email, String ip) {
        String address = email == null ? "" : email.trim().toLowerCase();
        Optional<AppUser> found = users.findByEmail(address);

        if (found.isEmpty()) {
            // Deliberately silent. The caller gets the same answer either way.
            log.info("Password reset requested for an address with no account.");
            return Optional.empty();
        }

        AppUser user = found.get();
        if (user.isBlocked()) {
            log.warn("Password reset requested for a suspended account.");
            return Optional.empty();
        }

        // Any earlier token stops working the moment a new one is issued, so a
        // link forwarded or left in an old inbox cannot be used later.
        resets.markAllUsedFor(user.getId(), Instant.now());

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
            // The link belongs in an email. Until one can be sent, this is the
            // only place it appears.
            log.info("Password reset token for {}: {}", user.getEmail(), token);
        }
        return exposeToken ? Optional.of(token) : Optional.empty();
    }

    /** Completes a reset. */
    @Transactional
    public void complete(String token, String newPassword, String confirmPassword) {
        if (newPassword == null || newPassword.length() < 8) {
            throw new IllegalArgumentException("Use at least 8 characters.");
        }
        if (!newPassword.equals(confirmPassword)) {
            throw new IllegalArgumentException("The two passwords do not match.");
        }

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

        // Single use, marked before the method returns so a double submit
        // cannot spend the same token twice.
        row.setUsedAt(Instant.now());
        resets.save(row);
        log.info("Password reset completed for user {}.", user.getId());
    }

    /** Whether a token is still good, so the form can say so before asking. */
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
