package com.greenhaven.controller;

import java.security.Principal;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.greenhaven.dto.ApiMessage;
import com.greenhaven.dto.LoginRequest;
import com.greenhaven.dto.PageResponse;
import com.greenhaven.model.AdminActivityLog;
import com.greenhaven.model.AdminSession;
import com.greenhaven.model.AppUser;
import com.greenhaven.repository.AppUserRepository;
import com.greenhaven.security.JwtService;
import com.greenhaven.service.AdminAuditService;
import com.greenhaven.service.AdminSessionService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

/** Admin sign-in, sign-out and the activity trail. */
@RestController
@RequestMapping("/api/admin/auth")
public class AdminAuthController {

    private final AppUserRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final AdminSessionService sessions;
    private final AdminAuditService audit;

    public AdminAuthController(AppUserRepository users, PasswordEncoder encoder, JwtService jwt,
                               AdminSessionService sessions, AdminAuditService audit) {
        this.users = users;
        this.encoder = encoder;
        this.jwt = jwt;
        this.sessions = sessions;
        this.audit = audit;
    }

    /**
     * Signs an admin in.
     *
     * Every rejection returns the same message and takes the same time, so this
     * cannot be used to discover which addresses are admin accounts — the most
     * valuable thing an attacker could learn from it.
     */
    @PostMapping("/login")
    public Map<String, Object> login(@Valid @RequestBody LoginRequest request,
                                     HttpServletRequest http) {
        String email = request.email() == null ? "" : request.email().trim();
        AppUser user = users.findByEmail(email).orElse(null);

        boolean ok = user != null
                && encoder.matches(request.password(), user.getPasswordHash())
                && "ADMIN".equals(user.getRole())
                && !user.isBlocked();

        if (!ok) {
            // Burn the same BCrypt time on the miss, so a non-existent address
            // cannot be told apart from a wrong password by the clock.
            if (user == null) {
                encoder.matches(request.password(),
                        "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy");
            }
            audit.record(email, AdminAuditService.LOGIN_FAILED, null, null,
                    "Rejected admin sign-in", http);
            throw new IllegalArgumentException("Those credentials are not valid.");
        }

        String jti = sessions.open(user, http);
        String token = jwt.issue(user.getEmail(), user.getRole(), jti, sessions.sessionMillis());
        audit.record(user.getEmail(), AdminAuditService.LOGIN, null, null,
                "Signed in", http);

        return Map.of(
                "token", token,
                "expiresInMs", sessions.sessionMillis(),
                "user", Map.of(
                        "id", user.getId(),
                        "fullName", user.getFullName(),
                        "email", user.getEmail(),
                        "role", user.getRole()));
    }

    /**
     * Signs out for real.
     *
     * Revoking the session is what makes this meaningful: without it, "logout"
     * only clears the browser's copy while the token stays valid, and anyone
     * holding it — including whoever presses the back button on a shared
     * machine — can carry on using the dashboard.
     */
    @PostMapping("/logout")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiMessage logout(@RequestHeader(value = "Authorization", required = false) String header,
                             Principal principal, HttpServletRequest http) {
        if (header != null && header.startsWith("Bearer ")) {
            try {
                sessions.revoke(jwt.claims(header.substring(7)).getId(), AdminSession.LOGOUT);
            } catch (Exception ignored) {
                // Already expired or malformed — nothing left to revoke.
            }
        }
        audit.record(principal == null ? null : principal.getName(),
                AdminAuditService.LOGOUT, null, null, "Signed out", http);
        return new ApiMessage("Signed out.");
    }

    /** Confirms the token is still good — the guard calls this on every load. */
    @GetMapping("/me")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Object> me(Principal principal) {
        AppUser user = users.findByEmail(principal.getName()).orElseThrow();
        return Map.of(
                "id", user.getId(),
                "fullName", user.getFullName(),
                "email", user.getEmail(),
                "role", user.getRole());
    }

    @GetMapping("/activity")
    @PreAuthorize("hasRole('ADMIN')")
    public PageResponse<AdminActivityLog> activity(
            @RequestParam(required = false) String action,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size) {
        Page<AdminActivityLog> found = audit.recent(action, page, size);
        return PageResponse.of(found);
    }
}
