package com.greenhaven.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import com.greenhaven.model.Coupon;
import com.greenhaven.service.PricingService;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/** Discount codes, as the storefront and the dashboard see them. */
public final class CouponDtos {

    private CouponDtos() {
    }

    /**
     * A basket to price, plus the code to try on it.
     *
     * Slugs and quantities, exactly as checkout takes them — never a subtotal.
     * The server works out what the basket is worth.
     */
    public record QuoteRequest(
            @NotBlank(message = "Enter a code.")
            @Size(max = 40, message = "That is not a code we issue.")
            String code,

            @NotEmpty(message = "Your cart is empty")
            @Size(max = 50, message = "An order can hold up to 50 different products")
            @Valid List<Line> items) {

        public record Line(
                @NotBlank String slug,
                @Positive @Max(99) int quantity) {
        }
    }

    /**
     * What the basket costs with the code applied — or why it does not apply.
     *
     * The totals come back either way, so the page can show the real figures
     * whichever answer it got, rather than keeping its own copy of the
     * arithmetic to fall back on.
     */
    public record QuoteResponse(
            boolean applied,
            String code,
            String description,
            String message,
            BigDecimal subtotal,
            BigDecimal discount,
            BigDecimal shipping,
            BigDecimal tax,
            BigDecimal total) {

        public static QuoteResponse accepted(Coupon coupon, PricingService.Totals t) {
            return new QuoteResponse(true, coupon.getCode(), coupon.getDescription(), null,
                    t.subtotal(), t.discount(), t.shipping(), t.tax(), t.total());
        }

        public static QuoteResponse rejected(BigDecimal subtotal, PricingService.Totals t,
                                             String message) {
            return new QuoteResponse(false, null, null, message,
                    t.subtotal(), t.discount(), t.shipping(), t.tax(), t.total());
        }
    }

    /** A coupon as the dashboard lists it, with what it has actually cost. */
    public record CouponRow(
            Long id,
            String code,
            String description,
            String discountType,
            BigDecimal discountValue,
            BigDecimal maxDiscount,
            BigDecimal minOrderValue,
            boolean freeShipping,
            Instant startsAt,
            Instant expiresAt,
            Integer usageLimit,
            int perUserLimit,
            boolean active,
            Instant createdAt,
            long timesUsed,
            BigDecimal givenAway,
            /** Live, expired, not started, fully claimed — one word for the list. */
            String state) {
    }

    public record CouponRequest(
            @NotBlank(message = "A code is required.")
            @Size(max = 40, message = "Keep the code under 40 characters.")
            String code,

            @Size(max = 200, message = "Keep the description under 200 characters.")
            String description,

            @NotBlank(message = "Choose a discount type.")
            String discountType,

            @NotNull(message = "Enter the discount.")
            @DecimalMin(value = "0.01", message = "The discount must be more than zero.")
            BigDecimal discountValue,

            BigDecimal maxDiscount,
            BigDecimal minOrderValue,
            Boolean freeShipping,
            Instant startsAt,
            Instant expiresAt,
            Integer usageLimit,
            Integer perUserLimit,
            Boolean active) {
    }
}
