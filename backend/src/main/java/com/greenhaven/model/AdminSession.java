package com.greenhaven.model;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * A live admin sign-in.
 *
 * A JWT cannot be recalled once issued — "log out" on a bearer token usually
 * means the browser forgets its copy while the token stays valid for hours.
 * Requiring a matching row here turns the token into something the server can
 * actually withdraw, which is what makes real logout, an idle timeout and
 * one-session-at-a-time possible.
 */
@Entity
@Table(name = "admin_session")
public class AdminSession {

    public static final String LOGOUT = "LOGOUT";
    public static final String SUPERSEDED = "SUPERSEDED";
    public static final String TIMEOUT = "TIMEOUT";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    /** The JWT's jti claim. */
    @Column(nullable = false, unique = true, length = 64)
    private String jti;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "user_agent", length = 255)
    private String userAgent;

    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "last_seen_at", nullable = false)
    private Instant lastSeenAt = Instant.now();

    @Column(nullable = false)
    private boolean revoked = false;

    @Column(name = "revoked_reason", length = 60)
    private String revokedReason;

    public Long getId() { return id; }

    public AppUser getUser() { return user; }
    public void setUser(AppUser user) { this.user = user; }

    public String getJti() { return jti; }
    public void setJti(String jti) { this.jti = jti; }

    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }

    public String getUserAgent() { return userAgent; }
    public void setUserAgent(String userAgent) { this.userAgent = userAgent; }

    public Instant getCreatedAt() { return createdAt; }

    public Instant getLastSeenAt() { return lastSeenAt; }
    public void setLastSeenAt(Instant lastSeenAt) { this.lastSeenAt = lastSeenAt; }

    public boolean isRevoked() { return revoked; }
    public void setRevoked(boolean revoked) { this.revoked = revoked; }

    public String getRevokedReason() { return revokedReason; }
    public void setRevokedReason(String revokedReason) { this.revokedReason = revokedReason; }
}
