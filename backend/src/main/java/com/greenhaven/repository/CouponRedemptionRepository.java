package com.greenhaven.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.greenhaven.entity.CouponRedemption;

public interface CouponRedemptionRepository extends JpaRepository<CouponRedemption, Long> {
    Optional<CouponRedemption> findByOrderId(Long orderId);

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

    @Query("""
            SELECT COALESCE(SUM(r.discount), 0) FROM CouponRedemption r
             WHERE r.coupon.id = :couponId
               AND r.order.status IN ('PAID', 'PAID_SHORT')
            """)
    java.math.BigDecimal totalGivenAway(@Param("couponId") Long couponId);
}
