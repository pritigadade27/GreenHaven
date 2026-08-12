package com.greenhaven.service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Locale;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.greenhaven.dto.CouponDtos;
import com.greenhaven.exception.ResourceNotFoundException;
import com.greenhaven.entity.AppUser;
import com.greenhaven.entity.Coupon;
import com.greenhaven.entity.CouponRedemption;
import com.greenhaven.entity.Order;
import com.greenhaven.entity.Plant;
import com.greenhaven.repository.AppUserRepository;
import com.greenhaven.repository.CouponRedemptionRepository;
import com.greenhaven.repository.CouponRepository;
import com.greenhaven.repository.PlantRepository;

/** Discount codes: checking them, quoting them, and taking them. */
@Service
public class CouponService {

    private final CouponRepository coupons;
    private final CouponRedemptionRepository redemptions;
    private final AppUserRepository users;
    private final PlantRepository plants;
    private final PricingService pricing;

    public CouponService(CouponRepository coupons, CouponRedemptionRepository redemptions,
                         AppUserRepository users, PlantRepository plants, PricingService pricing) {
        this.coupons = coupons;
        this.redemptions = redemptions;
        this.users = users;
        this.plants = plants;
        this.pricing = pricing;
    }

    /** Codes are compared uppercase and trimmed, so what was typed rarely matters. */
    public static String normalise(String code) {
        return code == null ? "" : code.trim().toUpperCase(Locale.ROOT);
    }

    /** Prices a basket with a code applied, without taking anything. */
    @Transactional(readOnly = true)
    public CouponDtos.QuoteResponse quote(String email, CouponDtos.QuoteRequest request) {
        BigDecimal subtotal = subtotalOf(request);
        AppUser user = users.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Not signed in."));

        Optional<Coupon> found = coupons.findByCode(normalise(request.code()));
        if (found.isEmpty()) {
            return CouponDtos.QuoteResponse.rejected(subtotal, pricing.price(subtotal, null),
                    "We do not recognise that code.");
        }

        Coupon coupon = found.get();
        String problem = whyNot(coupon, user, subtotal);
        if (problem != null) {
            return CouponDtos.QuoteResponse.rejected(subtotal, pricing.price(subtotal, null), problem);
        }

        return CouponDtos.QuoteResponse.accepted(coupon, pricing.price(subtotal, coupon));
    }

    /** Validates a code at checkout and returns the coupon to price the order with, or throws with a. */
    @Transactional
    public Coupon claim(AppUser user, String rawCode, BigDecimal subtotal) {
        String code = normalise(rawCode);
        if (code.isEmpty()) return null;

        Coupon coupon = coupons.findByCodeForUpdate(code)
                .orElseThrow(() -> new IllegalArgumentException("We do not recognise that code."));

        String problem = whyNot(coupon, user, subtotal);
        if (problem != null) throw new IllegalArgumentException(problem);

        return coupon;
    }

    /** Records the use, once the order it belongs to exists. */
    @Transactional
    public void recordRedemption(Coupon coupon, AppUser user, Order order, BigDecimal discount) {
        CouponRedemption redemption = new CouponRedemption();
        redemption.setCoupon(coupon);
        redemption.setUser(user);
        redemption.setOrder(order);
        redemption.setDiscount(discount);
        redemptions.save(redemption);
    }

    /** Why this customer may not use this coupon right now, or null if they may. */
    private String whyNot(Coupon coupon, AppUser user, BigDecimal subtotal) {
        Instant now = Instant.now();

        if (!coupon.isActive()) {
            return "That code is no longer available.";
        }
        if (coupon.getStartsAt() != null && now.isBefore(coupon.getStartsAt())) {
            return "That code is not active yet.";
        }
        if (coupon.getExpiresAt() != null && now.isAfter(coupon.getExpiresAt())) {
            return "That code has expired.";
        }
        if (subtotal.compareTo(coupon.getMinOrderValue()) < 0) {
            BigDecimal short_ = coupon.getMinOrderValue().subtract(subtotal);
            return "That code needs a basket of ₹" + coupon.getMinOrderValue().stripTrailingZeros().toPlainString()
                    + " — add ₹" + short_.stripTrailingZeros().toPlainString() + " more.";
        }
        if (coupon.getUsageLimit() != null
                && redemptions.countLive(coupon.getId()) >= coupon.getUsageLimit()) {
            return "That code has been fully claimed.";
        }
        if (redemptions.countLiveForUser(coupon.getId(), user.getId()) >= coupon.getPerUserLimit()) {
            return coupon.getPerUserLimit() == 1
                    ? "You have already used that code."
                    : "You have used that code the maximum number of times.";
        }
        return null;
    }

    /** Re-prices the basket from the catalogue rather than trusting the request. */
    private BigDecimal subtotalOf(CouponDtos.QuoteRequest request) {
        if (request.items() == null || request.items().isEmpty()) {
            throw new IllegalArgumentException("Your cart is empty.");
        }
        BigDecimal subtotal = BigDecimal.ZERO;
        for (CouponDtos.QuoteRequest.Line line : request.items()) {
            Plant plant = plants.findBySlug(line.slug())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "No product with slug '" + line.slug() + "'"));
            int qty = Math.max(1, Math.min(99, line.quantity()));
            subtotal = subtotal.add(plant.getPrice().multiply(BigDecimal.valueOf(qty)));
        }
        return subtotal;
    }
}
