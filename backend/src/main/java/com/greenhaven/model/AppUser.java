package com.greenhaven.model;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * A customer account. Named AppUser rather than User because `user` is a
 * reserved word in several databases and makes for painful queries.
 */
@Entity
@Table(name = "app_user")
public class AppUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "full_name", nullable = false, length = 120)
    private String fullName;

    @Column(nullable = false, unique = true, length = 160)
    private String email;

    /** BCrypt hash. The plain password is never stored or logged. */
    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Column(length = 20)
    private String phone;

    @Column(name = "avatar_url", length = 255)
    private String avatarUrl;

    /**
     * A requested email change, not yet proved. Sign-in keeps using `email`
     * until the customer confirms, so a mistyped address cannot lock anyone
     * out of their own account.
     */
    @Column(name = "pending_email", length = 160)
    private String pendingEmail;

    @Column(name = "pending_email_token", length = 64)
    private String pendingEmailToken;

    @Column(name = "pending_email_expires_at")
    private Instant pendingEmailExpiresAt;

    @Column(nullable = false, length = 10)
    private String role = "CUSTOMER";

    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }

    public String getPendingEmail() { return pendingEmail; }
    public void setPendingEmail(String pendingEmail) { this.pendingEmail = pendingEmail; }

    public String getPendingEmailToken() { return pendingEmailToken; }
    public void setPendingEmailToken(String pendingEmailToken) { this.pendingEmailToken = pendingEmailToken; }

    public Instant getPendingEmailExpiresAt() { return pendingEmailExpiresAt; }
    public void setPendingEmailExpiresAt(Instant at) { this.pendingEmailExpiresAt = at; }

    /**
     * Set by an admin. A blocked account keeps its order history but is
     * refused a token at sign-in, so it cannot buy or check out.
     */
    @Column(name = "is_blocked", nullable = false)
    private boolean blocked = false;

    public boolean isBlocked() { return blocked; }
    public void setBlocked(boolean blocked) { this.blocked = blocked; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public Instant getCreatedAt() { return createdAt; }
}
