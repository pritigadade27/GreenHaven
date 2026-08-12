package com.greenhaven.security;

import java.nio.charset.StandardCharsets;
import java.util.Date;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

@Service
public class JwtService {
    private final SecretKey key;
    private final long expirationMs;

    public JwtService(@Value("${greenhaven.jwt.secret}") String secret,
                      @Value("${greenhaven.jwt.expiration-ms}") long expirationMs) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException(
                    "greenhaven.jwt.secret is not set. Put GREENHAVEN_JWT_SECRET in backend/.env "
                    + "or in the environment.");
        }
        if (secret.startsWith("change-this")) {
            throw new IllegalStateException(
                    "greenhaven.jwt.secret is still the example value. Generate a real one.");
        }
        byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) {
            throw new IllegalStateException(
                    "greenhaven.jwt.secret must be at least 32 characters long");
        }
        this.key = Keys.hmacShaKeyFor(bytes);
        this.expirationMs = expirationMs;
    }

    public String issue(String email, String role) {
        return issue(email, role, null, expirationMs);
    }

    public String issue(String email, String role, String jti, long lifetimeMs) {
        Date now = new Date();
        var builder = Jwts.builder()
                .subject(email)
                .claim("role", role)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + lifetimeMs))
                .signWith(key);
        if (jti != null) builder.id(jti);
        return builder.compact();
    }

    public Claims claims(String token) {
        return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
    }

    public String emailFrom(String token) {
        return claims(token).getSubject();
    }

    public long getExpirationMs() {
        return expirationMs;
    }
}
