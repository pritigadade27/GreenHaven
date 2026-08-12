package com.greenhaven.service;

import java.math.BigDecimal;
import java.math.RoundingMode;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.greenhaven.entity.Coupon;

/** What an order costs. */
@Service
public class PricingService {

    /** Matches the frontend's rule so the customer is never surprised. */
    private static final BigDecimal FREE_DELIVERY_OVER = BigDecimal.valueOf(999);
    private static final BigDecimal DELIVERY_FEE = BigDecimal.valueOf(99);

    /** GST, as a whole percentage. */
    private final BigDecimal gstPercent;

    public PricingService(@Value("${greenhaven.tax.gst-percent:0}") BigDecimal gstPercent) {
        this.gstPercent = gstPercent;
    }

    /** Every figure on the order, and how it got there. */
    public record Totals(
            BigDecimal subtotal,
            BigDecimal discount,
            BigDecimal shipping,
            BigDecimal tax,
            BigDecimal total) {
    }

    /** Prices a basket, with or without a coupon. */
    public Totals price(BigDecimal subtotal, Coupon coupon) {
        BigDecimal discount = discountFor(subtotal, coupon);
        BigDecimal goods = subtotal.subtract(discount);

        BigDecimal shipping = subtotal.compareTo(FREE_DELIVERY_OVER) >= 0
                ? BigDecimal.ZERO : DELIVERY_FEE;
        if (coupon != null && coupon.isFreeShipping()) {
            shipping = BigDecimal.ZERO;
        }

        BigDecimal tax = gstPercent.compareTo(BigDecimal.ZERO) <= 0
                ? BigDecimal.ZERO
                : goods.multiply(gstPercent)
                        .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

        return new Totals(subtotal, discount, shipping, tax, goods.add(shipping).add(tax));
    }

    /** What a coupon takes off a given subtotal. */
    public BigDecimal discountFor(BigDecimal subtotal, Coupon coupon) {
        if (coupon == null) return BigDecimal.ZERO;

        BigDecimal discount = Coupon.PERCENT.equals(coupon.getDiscountType())
                ? subtotal.multiply(coupon.getDiscountValue())
                        .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP)
                : coupon.getDiscountValue();

        if (coupon.getMaxDiscount() != null && discount.compareTo(coupon.getMaxDiscount()) > 0) {
            discount = coupon.getMaxDiscount();
        }
        if (discount.compareTo(subtotal) > 0) discount = subtotal;
        if (discount.compareTo(BigDecimal.ZERO) < 0) discount = BigDecimal.ZERO;

        return discount.setScale(2, RoundingMode.HALF_UP);
    }

    public BigDecimal freeDeliveryOver() { return FREE_DELIVERY_OVER; }

    public BigDecimal deliveryFee() { return DELIVERY_FEE; }
}
