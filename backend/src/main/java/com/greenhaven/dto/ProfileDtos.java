package com.greenhaven.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Everything the signed-in customer sees about themselves.
 *
 * Grouped in one file the way AdminDtos already is, so the profile's shapes
 * stay together rather than scattering fifteen one-record files through dto/.
 */
public final class ProfileDtos {

    private ProfileDtos() {
    }

    /** Indian mobile numbers, the same rule the checkout form applies. */
    private static final String PHONE = "^([+]?91[- ]?|0)?[6-9]\\d{9}$";
    private static final String PINCODE = "^\\d{6}$";

    public record Profile(
            Long id,
            String fullName,
            String email,
            String pendingEmail,
            String phone,
            String avatarUrl,
            Instant joinedAt,
            long totalOrders,
            BigDecimal totalSpent,
            long savedAddresses,
            long wishlistItems,
            long unreadNotifications) {
    }

    public record OrderSummary(
            String orderNumber,
            String invoiceNumber,
            Instant placedAt,
            String status,
            String deliveryStatus,
            String paymentStatus,
            String paymentMethod,
            BigDecimal total,
            int totalItems,
            String deliveryAddress,
            LocalDate estimatedDelivery,
            boolean cancellable,
            List<Thumb> preview) {

        /** Just enough of a line to draw the row — image, name, quantity. */
        public record Thumb(String slug, String name, String image, int quantity) {
        }
    }

    public record OrderDetail(
            String orderNumber,
            String invoiceNumber,
            String customerName,
            String customerEmail,
            Instant placedAt,
            String status,
            String deliveryStatus,
            LocalDate estimatedDelivery,
            Instant cancelledAt,
            String cancelReason,
            boolean cancellable,
            boolean invoiceAvailable,
            Address shipTo,
            List<Line> items,
            BigDecimal subtotal,
            BigDecimal tax,
            BigDecimal shipping,
            BigDecimal discount,
            BigDecimal total,
            PaymentRow payment,
            List<TimelineStep> timeline) {

        public record Address(String name, String line, String city, String state,
                             String pincode, String country, String phone) {
        }

        public record Line(String slug, String name, String image, String category,
                           int quantity, BigDecimal unitPrice, BigDecimal lineTotal) {
        }
    }

    /**
     * One step of the tracking strip. `state` is DONE, CURRENT, PENDING or
     * CANCELLED — the UI draws from that rather than recomputing the order of
     * fulfilment for itself.
     */
    public record TimelineStep(String key, String label, String state, Instant at) {
    }

    public record PaymentRow(
            Long id,
            String razorpayPaymentId,
            String razorpayOrderId,
            String orderNumber,
            String invoiceNumber,
            BigDecimal amount,
            String method,
            String status,
            String verificationStatus,
            String failureReason,
            Instant paidAt,
            boolean invoiceAvailable) {
    }

    /**
     * One issued document. `docType` is INVOICE or CREDIT_NOTE — the page must
     * be able to tell them apart, because one says money was taken and the
     * other says it is owed back.
     */
    public record InvoiceRow(
            String invoiceNumber,
            String orderNumber,
            Instant invoiceDate,
            BigDecimal total,
            int totalItems,
            String docType,
            String reason) {
    }

    public record AddressDto(
            Long id,
            String label,
            String fullName,
            String phone,
            String line1,
            String line2,
            String city,
            String state,
            String pincode,
            String country,
            boolean isDefault) {
    }

    public record NotificationDto(
            Long id,
            String type,
            String title,
            String body,
            String orderNumber,
            boolean read,
            Instant createdAt) {
    }

    public record UpdateProfileRequest(
            @NotBlank(message = "Your name is required.")
            @Size(min = 2, max = 120, message = "Use between 2 and 120 characters.")
            String fullName,

            // Optional, but must be a real number if given. An empty string is
            // how the form says "no number", and is normalised to null.
            @Pattern(regexp = PHONE + "|^$", message = "Enter a 10-digit Indian mobile number.")
            String phone,

            @Size(max = 255, message = "That image address is too long.")
            String avatarUrl) {
    }

    public record ChangeEmailRequest(
            @NotBlank @Email(message = "Enter a valid email address.")
            @Size(max = 160) String email,
            @NotBlank(message = "Confirm your password to change your email.") String password) {
    }

    public record ChangePasswordRequest(
            @NotBlank(message = "Enter your current password.") String currentPassword,
            @NotBlank @Size(min = 8, max = 100,
                    message = "Use at least 8 characters.") String newPassword,
            @NotBlank String confirmPassword) {
    }

    public record AddressRequest(
            @NotBlank @Size(max = 30) String label,
            @NotBlank(message = "Who is this parcel for?") @Size(max = 120) String fullName,
            @NotBlank @Pattern(regexp = PHONE,
                    message = "Enter a 10-digit Indian mobile number.") String phone,
            @NotBlank(message = "Enter the full address.") @Size(min = 6, max = 255) String line1,
            @Size(max = 255) String line2,
            @NotBlank(message = "City is required.") @Size(max = 80) String city,
            @NotBlank(message = "State is required.") @Size(max = 80) String state,
            @NotBlank @Pattern(regexp = PINCODE,
                    message = "Enter a 6-digit pincode.") String pincode,
            @Size(max = 60) String country,
            boolean makeDefault) {
    }

    public record CancelOrderRequest(@Size(max = 255) String reason) {
    }
}
