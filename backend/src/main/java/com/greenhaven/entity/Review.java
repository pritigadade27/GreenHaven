package com.greenhaven.entity;

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

/** A customer's review of a product. */
@Entity
@Table(name = "review")
public class Review {

    /** Awaiting moderation. Written before the storefront could post reviews. */
    public static final String PENDING = "PENDING";
    /** Visible on the product page. Where a verified purchase lands. */
    public static final String APPROVED = "APPROVED";
    public static final String REJECTED = "REJECTED";
    /** Taken down by an admin. */
    public static final String HIDDEN = "HIDDEN";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "plant_id", nullable = false)
    private Plant plant;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    /** The delivered order that earned the right to write this. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id")
    private Order order;

    /** Settled when the review is written, not looked up when it is read: it is a fact about that. */
    @Column(name = "verified_purchase", nullable = false)
    private boolean verifiedPurchase = false;

    @Column(nullable = false)
    private java.math.BigDecimal rating;

    @Column(length = 150)
    private String title;

    @Column(length = 2000)
    private String body;

    @Column(nullable = false, length = 16)
    private String status = PENDING;

    @Column(name = "hidden_reason", length = 255)
    private String hiddenReason;

    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;

    /** Null until the customer edits it — an edited review says so. */
    @Column(name = "updated_at")
    private Instant updatedAt;

    public Long getId() { return id; }

    public Plant getPlant() { return plant; }
    public void setPlant(Plant plant) { this.plant = plant; }

    public AppUser getUser() { return user; }
    public void setUser(AppUser user) { this.user = user; }

    public java.math.BigDecimal getRating() { return rating; }
    public void setRating(java.math.BigDecimal rating) { this.rating = rating; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }

    public Order getOrder() { return order; }
    public void setOrder(Order order) { this.order = order; }

    public boolean isVerifiedPurchase() { return verifiedPurchase; }
    public void setVerifiedPurchase(boolean verifiedPurchase) { this.verifiedPurchase = verifiedPurchase; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getHiddenReason() { return hiddenReason; }
    public void setHiddenReason(String hiddenReason) { this.hiddenReason = hiddenReason; }

    public Instant getCreatedAt() { return createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
