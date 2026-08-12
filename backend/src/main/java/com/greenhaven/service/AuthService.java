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

    private static final String DUMMY_HASH =
            "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

    public AuthResponse login(LoginRequest request) {
        AppUser user = users.findByEmail(request.email().trim()).orElse(null);

        if (user == null) {
            encoder.matches(request.password(), DUMMY_HASH);
            throw new IllegalArgumentException("Email or password is incorrect.");
        }

        if (!encoder.matches(request.password(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Email or password is incorrect.");
        }

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
