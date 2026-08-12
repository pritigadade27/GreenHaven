package com.greenhaven.controller;

import java.security.Principal;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import com.greenhaven.dto.ApiMessage;
import org.springframework.web.bind.annotation.RestController;

import com.greenhaven.dto.AuthResponse;
import com.greenhaven.dto.LoginRequest;
import com.greenhaven.dto.RegisterRequest;
import com.greenhaven.dto.UserDto;
import com.greenhaven.service.AuthService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService auth;
    private final com.greenhaven.service.PasswordResetService passwordResets;

    public AuthController(AuthService auth, com.greenhaven.service.PasswordResetService passwordResets) {
        this.passwordResets = passwordResets;
        this.auth = auth;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(auth.register(request));
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return auth.login(request);
    }

    @PostMapping("/forgot-password")
    public java.util.Map<String, String> forgotPassword(
            @RequestBody java.util.Map<String, String> body,
            jakarta.servlet.http.HttpServletRequest http) {
        // Same reply hides unknown emails
        var token = passwordResets.request(body.get("email"), http.getRemoteAddr());
        java.util.Map<String, String> response = new java.util.LinkedHashMap<>();
        response.put("message",
                "If that address has an account, a reset link is on its way. "
                        + "It is good for one hour.");
        token.ifPresent(value -> response.put("token", value));
        return response;
    }

    @GetMapping("/reset-password")
    public java.util.Map<String, Boolean> checkReset(@RequestParam String token) {
        return java.util.Map.of("usable", passwordResets.isUsable(token));
    }

    @PostMapping("/reset-password")
    public ApiMessage resetPassword(@RequestBody java.util.Map<String, String> body) {
        // Set password against reset token
        passwordResets.complete(body.get("token"), body.get("newPassword"),
                body.get("confirmPassword"));
        return new ApiMessage("Your password has been changed. You can sign in with it now.");
    }

    @GetMapping("/me")
    public UserDto me(Principal principal) {
        return auth.currentUser(principal.getName());
    }
}
