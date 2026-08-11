package com.greenhaven.service;

import java.math.BigDecimal;
import java.math.RoundingMode;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.greenhaven.model.Coupon;

/**
 * What an order costs.
 *
 * One place, because the figure quoted while a customer is deciding and the
 * figure they are charged have to be the same figure. Two implementations of
 * "subtotal, less the discount, plus delivery, plus tax" will disagree
 * eventually, and the first anyone hears of it is a customer being charged more
 * than the basket said.
 */
@Service
public class PricingService {

    /** Matches the frontend's rule so the customer is never surprised. */
    private static final BigDecimal FREE_DELIVERY_OVER = BigDecimal.valueOf(999);
    private static final BigDecimal DELIVERY_FEE = BigDecimal.valueOf(99);

    /**
     * GST, as a whole percentage.
     *
     * Zero by default, and zero is a real answer rather than a placeholder:
     * live nursery plants attract no GST in India. At zero the invoice does not
     * call itself a tax invoice — see InvoicePdfService.
     */
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

    /**
     * Prices a basket, with or without a coupon.
     *
     * The order of operations is deliberate:
     *
     * The discount comes off the goods only — never off delivery or tax, which
     * are not ours to discount.
     *
     * Delivery is decided on the subtotal BEFORE the discount. A customer who
     * put ₹1,050 in their basket has earned free delivery; a coupon taking them
     * to ₹950 must not then add ₹99 back and hand them a worse total for using
     * a discount code. That would be a genuinely infuriating thing to discover
     * at the last step.
     *
     * Tax is charged on what is actually paid for the goods — the discounted
     * figure — and rounded once at the end rather than per line, because
     * rounding each line separately drifts by paise until the invoice stops
     * adding up.
     */
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

    /**
     * What a coupon takes off a given subtotal.
     *
     * Never more than the goods themselves: a ₹500 flat code on a ₹300 basket
     * takes ₹300, not ₹500 with the balance coming out of delivery or, worse, a
     * negative total sent to the payment gateway.
     */
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
