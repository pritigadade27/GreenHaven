package com.greenhaven.security;

import java.nio.charset.StandardCharsets;
import java.util.Date;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

/** Issues and reads the signed tokens returned by /api/auth/login. */
@Service
public class JwtService {

    private final SecretKey key;
    private final long expirationMs;

    public JwtService(@Value("${greenhaven.jwt.secret}") String secret,
                      @Value("${greenhaven.jwt.expiration-ms}") long expirationMs) {
        // HS256 needs at least 256 bits of key material. A short secret in the
        // properties file would otherwise fail confusingly at the first sign-in
        // rather than here at startup.
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException(
                    "greenhaven.jwt.secret is not set. Put GREENHAVEN_JWT_SECRET in backend/.env "
                    + "or in the environment.");
        }
        // A placeholder that ships in source is a master key that ships in
        // source. Refuse to start rather than sign real sessions with it.
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

    /**
     * Issues a token, optionally tied to a server-side session.
     *
     * The `jti` is what makes an admin token revocable: the filter refuses
     * it unless a live admin_session row still carries that id. Customer
     * tokens pass null and stay stateless, because forcing a database read
     * on every catalogue request to revoke a shopping session is a cost
     * with no matching benefit.
     */
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

    /** All claims, verified. Throws if the signature or expiry is bad. */
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
