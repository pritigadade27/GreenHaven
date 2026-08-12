package com.greenhaven.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.greenhaven.dto.AuthResponse;
import com.greenhaven.dto.LoginRequest;
import com.greenhaven.dto.RegisterRequest;
import com.greenhaven.dto.UserDto;
import com.greenhaven.exception.ResourceNotFoundException;
import com.greenhaven.entity.AppUser;
import com.greenhaven.repository.AppUserRepository;
import com.greenhaven.security.JwtService;

@Service
// Deliberately NOT @Transactional at class level: login and register spend ~80ms inside BCrypt doing no database work at all, and a class-level transaction pinned a pooled connection for every millisecond of it.
public class AuthService {

    private final AppUserRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwt;

    public AuthService(AppUserRepository users, PasswordEncoder encoder, JwtService jwt) {
        this.users = users;
        this.encoder = encoder;
        this.jwt = jwt;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = request.email().trim().toLowerCase();
        if (users.existsByEmail(email)) {
            throw new IllegalArgumentException("An account with that email already exists.");
        }

        AppUser user = new AppUser();
        user.setFullName(request.fullName().trim());
        user.setEmail(email);
        user.setPasswordHash(encoder.encode(request.password()));
        user.setPhone(request.phone() == null || request.phone().isBlank()
                ? null : request.phone().trim());
        user.setRole("CUSTOMER");
        users.save(user);

        return tokenFor(user);
    }

    /** A BCrypt hash of a value nobody can supply, used only to burn the same ~80 ms an unknown email would otherwise skip. */
    private static final String DUMMY_HASH =
            "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

    public AuthResponse login(LoginRequest request) {
        // The same message is returned for an unknown email and a wrong password, so this endpoint cannot.
        AppUser user = users.findByEmail(request.email().trim()).orElse(null);

        if (user == null) {
            encoder.matches(request.password(), DUMMY_HASH);   // constant-cost path
            throw new IllegalArgumentException("Email or password is incorrect.");
        }

        if (!encoder.matches(request.password(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Email or password is incorrect.");
        }

        // Checked after the password, not before: answering differently to a blocked account than to a.
        if (user.isBlocked()) {
            throw new IllegalArgumentException(
                    "This account has been suspended. Please contact us at hello@greenhaven.in.");
        }
        return tokenFor(user);
    }

    @Transactional(readOnly = true)
    public UserDto currentUser(String email) {
        return users.findByEmail(email).map(this::toDto)
                .orElseThrow(() -> new ResourceNotFoundException("Not signed in."));
    }

    private AuthResponse tokenFor(AppUser user) {
        return new AuthResponse(jwt.issue(user.getEmail(), user.getRole()),
                jwt.getExpirationMs(), toDto(user));
    }

    private UserDto toDto(AppUser user) {
        return new UserDto(user.getId(), user.getFullName(), user.getEmail(), user.getRole());
    }
}
