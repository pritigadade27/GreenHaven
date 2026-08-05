package com.greenhaven.controller;

import java.security.Principal;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.greenhaven.dto.AuthResponse;
import com.greenhaven.dto.LoginRequest;
import com.greenhaven.dto.RegisterRequest;
import com.greenhaven.dto.UserDto;
import com.greenhaven.service.AuthService;

import jakarta.validation.Valid;

/**
 *   POST /api/auth/register
 *   POST /api/auth/login
 *   GET  /api/auth/me     (requires the bearer token)
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService auth;

    public AuthController(AuthService auth) {
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

    @GetMapping("/me")
    public UserDto me(Principal principal) {
        return auth.currentUser(principal.getName());
    }
}
