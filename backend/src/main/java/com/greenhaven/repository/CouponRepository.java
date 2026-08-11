package com.greenhaven.repository;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.greenhaven.model.Coupon;

import jakarta.persistence.LockModeType;

public interface CouponRepository extends JpaRepository<Coupon, Long> {

    Optional<Coupon> findByCode(String code);

    boolean existsByCode(String code);

    Page<Coupon> findAllByOrderByIdDesc(Pageable pageable);

    /**
     * Locks the coupon row for the length of the transaction.
     *
     * Without it, two checkouts can both read "9 of 10 used" in the same
     * instant and both proceed, taking a one-per-customer coupon twice or
     * pushing a limited code past its ceiling. The same reason stock is
     * decremented under a lock.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM Coupon c WHERE c.code = :code")
    Optional<Coupon> findByCodeForUpdate(@Param("code") String code);
}
