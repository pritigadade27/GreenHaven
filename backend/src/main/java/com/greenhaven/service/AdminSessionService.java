package com.greenhaven.service;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.greenhaven.model.AdminSession;
import com.greenhaven.model.AppUser;
import com.greenhaven.repository.AdminSessionRepository;

import jakarta.servlet.http.HttpServletRequest;

/** Decides whether an admin token is still worth honouring. */
@Service
public class AdminSessionService {

    private final AdminSessionRepository sessions;
    private final long sessionMinutes;
    private final long idleMinutes;
    private final boolean singleSession;

    public AdminSessionService(AdminSessionRepository sessions,
                               @Value("${greenhaven.admin.session-minutes:60}") long sessionMinutes,
                               @Value("${greenhaven.admin.idle-minutes:20}") long idleMinutes,
                               @Value("${greenhaven.admin.single-session:true}") boolean singleSession) {
        this.sessions = sessions;
        this.sessionMinutes = sessionMinutes;
        this.idleMinutes = idleMinutes;
        this.singleSession = singleSession;
    }

    public long sessionMillis() {
        return Duration.ofMinutes(sessionMinutes).toMillis();
    }

    /** Opens a session and returns the jti to embed in the token. */
    @Transactional
    public String open(AppUser admin, HttpServletRequest request) {
        if (singleSession) {
            // Revoke anything still open. A session left behind on a shared
            // machine should not survive the next sign-in somewhere else.
            List<AdminSession> live = sessions.findByUserIdAndRevokedFalse(admin.getId());
            for (AdminSession old : live) {
                old.setRevoked(true);
                old.setRevokedReason(AdminSession.SUPERSEDED);
            }
            sessions.saveAll(live);
        }

        AdminSession session = new AdminSession();
        session.setUser(admin);
        session.setJti(UUID.randomUUID().toString());
        session.setIpAddress(clientIp(request));
        session.setUserAgent(trim(request.getHeader("User-Agent"), 255));
        session.setLastSeenAt(Instant.now());
        sessions.save(session);
        return session.getJti();
    }

    /**
     * True when the token may still be used, and touches the idle clock.
     *
     * REQUIRES_NEW because this runs inside a security filter, before any
     * request transaction exists — and because the touch must persist even if
     * the request it belongs to later rolls back.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean isLive(String jti) {
        if (jti == null || jti.isBlank()) return false;

        AdminSession session = sessions.findByJti(jti).orElse(null);
        if (session == null || session.isRevoked()) return false;

        Instant now = Instant.now();
        if (Duration.between(session.getLastSeenAt(), now).toMinutes() >= idleMinutes) {
            session.setRevoked(true);
            session.setRevokedReason(AdminSession.TIMEOUT);
            sessions.save(session);
            return false;
        }

        // Only write when the clock has actually moved.
        if (Duration.between(session.getLastSeenAt(), now).toSeconds() >= 30) {
            session.setLastSeenAt(now);
            sessions.save(session);
        }
        return true;
    }

    @Transactional
    public void revoke(String jti, String reason) {
        sessions.findByJti(jti).ifPresent(session -> {
            session.setRevoked(true);
            session.setRevokedReason(reason);
            sessions.save(session);
        });
    }

    @Transactional
    public void revokeAllFor(Long userId, String reason) {
        List<AdminSession> live = sessions.findByUserIdAndRevokedFalse(userId);
        live.forEach(s -> {
            s.setRevoked(true);
            s.setRevokedReason(reason);
        });
        sessions.saveAll(live);
    }

    /**
     * Best-effort client address for the audit log.
     *
     * X-Forwarded-For is client-supplied and is NOT trusted for anything that
     * grants or denies access — see RateLimitFilter, where believing it defeated
     * the whole limiter. Here it only annotates a log line, so a spoofed value
     * misleads a reader rather than bypassing a control.
     */
    public static String clientIp(HttpServletRequest request) {
        if (request == null) return null;
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            int comma = forwarded.indexOf(',');
            return trim((comma > 0 ? forwarded.substring(0, comma) : forwarded).trim(), 45);
        }
        return trim(request.getRemoteAddr(), 45);
    }

    private static String trim(String value, int max) {
        if (value == null) return null;
        return value.length() <= max ? value : value.substring(0, max);
    }
}
