package com.greenhaven.service;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.greenhaven.entity.AdminSession;
import com.greenhaven.entity.AppUser;
import com.greenhaven.repository.AdminSessionRepository;

import jakarta.servlet.http.HttpServletRequest;

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

    @Transactional
    public String open(AppUser admin, HttpServletRequest request) {
        if (singleSession) {
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
