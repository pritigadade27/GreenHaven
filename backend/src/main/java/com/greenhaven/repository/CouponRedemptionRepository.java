package com.greenhaven.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.greenhaven.model.CouponRedemption;

public interface CouponRedemptionRepository extends JpaRepository<CouponRedemption, Long> {

    Optional<CouponRedemption> findByOrderId(Long orderId);

    /**
     * How many times this coupon has been taken, ignoring orders that came to
     * nothing.
     *
     * The status filter is what releases a code when a checkout is abandoned or
     * an order is cancelled: the row stays for the audit trail, but it stops
     * counting against either limit. No separate release step means no release
     * step to forget.
     */
    @Query("""
            SELECT COUNT(r) FROM CouponRedemption r
             WHERE r.coupon.id = :couponId
               AND r.order.status NOT IN ('CANCELLED', 'FAILED')
            """)
    long countLive(@Param("couponId") Long couponId);

    @Query("""
            SELECT COUNT(r) FROM CouponRedemption r
             WHERE r.coupon.id = :couponId
               AND r.user.id = :userId
               AND r.order.status NOT IN ('CANCELLED', 'FAILED')
            """)
    long countLiveForUser(@Param("couponId") Long couponId, @Param("userId") Long userId);

    /** Total actually given away on paid orders, for the admin's figures. */
    @Query("""
            SELECT COALESCE(SUM(r.discount), 0) FROM CouponRedemption r
             WHERE r.coupon.id = :couponId
               AND r.order.status IN ('PAID', 'PAID_SHORT')
            """)
    java.math.BigDecimal totalGivenAway(@Param("couponId") Long couponId);
}
