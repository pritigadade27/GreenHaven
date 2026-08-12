package com.greenhaven.entity;

import java.math.BigDecimal;
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

/** One attempt to pay for an order. */
@Entity
@Table(name = "payment")
public class Payment {

    /** What Razorpay reports. */
    public static final String CREATED = "CREATED";
    public static final String CAPTURED = "CAPTURED";
    public static final String FAILED = "FAILED";

    /** What our own signature check concluded. */
    public static final String UNVERIFIED = "UNVERIFIED";
    public static final String VERIFIED = "VERIFIED";
    public static final String VERIFICATION_FAILED = "FAILED";

    /** How we learned of it. */
    public static final String SOURCE_BROWSER = "BROWSER";
    public static final String SOURCE_WEBHOOK = "WEBHOOK";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @Column(name = "razorpay_order_id", nullable = false, length = 64)
    private String razorpayOrderId;

    @Column(name = "razorpay_payment_id", length = 64)
    private String razorpayPaymentId;

    /** Kept: it is the proof the payment was genuine if it is ever disputed. */
    @Column(name = "razorpay_signature", length = 255)
    private String razorpaySignature;

    @Column(length = 40)
    private String method;

    @Column(nullable = false, length = 8)
    private String currency = "INR";

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount = BigDecimal.ZERO;

    @Column(nullable = false, length = 24)
    private String status = CREATED;

    @Column(name = "verification_status", nullable = false, length = 24)
    private String verificationStatus = UNVERIFIED;

    @Column(name = "failure_reason", length = 255)
    private String failureReason;

    @Column(name = "refund_status", nullable = false, length = 24)
    private String refundStatus = "NONE";

    @Column(name = "refund_amount", precision = 10, scale = 2)
    private BigDecimal refundAmount;

    @Column(nullable = false, length = 16)
    private String source = SOURCE_BROWSER;

    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "verified_at")
    private Instant verifiedAt;

    public Long getId() { return id; }

    public Order getOrder() { return order; }
    public void setOrder(Order order) { this.order = order; }

    public String getRazorpayOrderId() { return razorpayOrderId; }
    public void setRazorpayOrderId(String v) { this.razorpayOrderId = v; }

    public String getRazorpayPaymentId() { return razorpayPaymentId; }
    public void setRazorpayPaymentId(String v) { this.razorpayPaymentId = v; }

    public String getRazorpaySignature() { return razorpaySignature; }
    public void setRazorpaySignature(String v) { this.razorpaySignature = v; }

    public String getMethod() { return method; }
    public void setMethod(String method) { this.method = method; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getVerificationStatus() { return verificationStatus; }
    public void setVerificationStatus(String v) { this.verificationStatus = v; }

    public String getFailureReason() { return failureReason; }
    public void setFailureReason(String v) { this.failureReason = v; }

    public String getRefundStatus() { return refundStatus; }
    public void setRefundStatus(String v) { this.refundStatus = v; }

    public BigDecimal getRefundAmount() { return refundAmount; }
    public void setRefundAmount(BigDecimal v) { this.refundAmount = v; }

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }

    public Instant getCreatedAt() { return createdAt; }

    public Instant getVerifiedAt() { return verifiedAt; }
    public void setVerifiedAt(Instant verifiedAt) { this.verifiedAt = verifiedAt; }
}
