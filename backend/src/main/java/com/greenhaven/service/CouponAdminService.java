package com.greenhaven.service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Locale;
import java.util.Set;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.greenhaven.dto.CouponDtos;
import com.greenhaven.exception.ResourceNotFoundException;
import com.greenhaven.entity.Coupon;
import com.greenhaven.repository.CouponRedemptionRepository;
import com.greenhaven.repository.CouponRepository;

@Service
public class CouponAdminService {
    private static final Set<String> TYPES = Set.of(Coupon.PERCENT, Coupon.FLAT);

    private final CouponRepository coupons;
    private final CouponRedemptionRepository redemptions;

    public CouponAdminService(CouponRepository coupons, CouponRedemptionRepository redemptions) {
        this.coupons = coupons;
        this.redemptions = redemptions;
    }

    @Transactional(readOnly = true)
    public Page<CouponDtos.CouponRow> list(int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), 100));
        return coupons.findAllByOrderByIdDesc(pageable).map(this::toRow);
    }

    @Transactional
    public CouponDtos.CouponRow create(CouponDtos.CouponRequest r) {
        String code = CouponService.normalise(r.code());
        if (coupons.existsByCode(code)) {
            throw new IllegalArgumentException("A coupon with the code '" + code + "' already exists.");
        }
        Coupon coupon = new Coupon();
        coupon.setCode(code);
        apply(coupon, r);
        return toRow(coupons.save(coupon));
    }

    @Transactional
    public CouponDtos.CouponRow update(Long id, CouponDtos.CouponRequest r) {
        Coupon coupon = coupons.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("No coupon with id " + id));

        String code = CouponService.normalise(r.code());
        if (!code.equals(coupon.getCode())) {
            if (coupons.existsByCode(code)) {
                throw new IllegalArgumentException("Another coupon already uses '" + code + "'.");
            }
            coupon.setCode(code);
        }
        apply(coupon, r);
        return toRow(coupons.save(coupon));
    }

    @Transactional
    public CouponDtos.CouponRow setActive(Long id, boolean active) {
        Coupon coupon = coupons.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("No coupon with id " + id));
        coupon.setActive(active);
        return toRow(coupons.save(coupon));
    }

    private void apply(Coupon c, CouponDtos.CouponRequest r) {
        String type = r.discountType() == null ? "" : r.discountType().trim().toUpperCase(Locale.ROOT);
        if (!TYPES.contains(type)) {
            throw new IllegalArgumentException("A discount is either PERCENT or FLAT.");
        }
        if (Coupon.PERCENT.equals(type) && r.discountValue().compareTo(BigDecimal.valueOf(100)) > 0) {
            throw new IllegalArgumentException("A percentage discount cannot exceed 100.");
        }
        if (r.startsAt() != null && r.expiresAt() != null && r.expiresAt().isBefore(r.startsAt())) {
            throw new IllegalArgumentException("The end date cannot be before the start date.");
        }
        if (r.usageLimit() != null && r.usageLimit() < 1) {
            throw new IllegalArgumentException("An overall limit of zero would make the code unusable.");
        }

        c.setDescription(blank(r.description()));
        c.setDiscountType(type);
        c.setDiscountValue(r.discountValue());
        c.setMaxDiscount(r.maxDiscount());
        c.setMinOrderValue(r.minOrderValue() == null ? BigDecimal.ZERO : r.minOrderValue());
        c.setFreeShipping(Boolean.TRUE.equals(r.freeShipping()));
        c.setStartsAt(r.startsAt());
        c.setExpiresAt(r.expiresAt());
        c.setUsageLimit(r.usageLimit());
        c.setPerUserLimit(r.perUserLimit() == null ? 1 : Math.max(1, r.perUserLimit()));
        if (r.active() != null) c.setActive(r.active());
    }

    private CouponDtos.CouponRow toRow(Coupon c) {
        long used = redemptions.countLive(c.getId());
        return new CouponDtos.CouponRow(
                c.getId(), c.getCode(), c.getDescription(), c.getDiscountType(),
                c.getDiscountValue(), c.getMaxDiscount(), c.getMinOrderValue(), c.isFreeShipping(),
                c.getStartsAt(), c.getExpiresAt(), c.getUsageLimit(), c.getPerUserLimit(),
                c.isActive(), c.getCreatedAt(), used,
                redemptions.totalGivenAway(c.getId()), state(c, used));
    }

    private static String state(Coupon c, long used) {
        Instant now = Instant.now();
        if (!c.isActive()) return "Off";
        if (c.getStartsAt() != null && now.isBefore(c.getStartsAt())) return "Scheduled";
        if (c.getExpiresAt() != null && now.isAfter(c.getExpiresAt())) return "Expired";
        if (c.getUsageLimit() != null && used >= c.getUsageLimit()) return "Claimed";
        return "Live";
    }

    private static String blank(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
