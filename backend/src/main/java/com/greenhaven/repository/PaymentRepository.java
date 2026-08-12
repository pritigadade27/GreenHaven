package com.greenhaven.repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.greenhaven.entity.Payment;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    Optional<Payment> findByRazorpayPaymentId(String razorpayPaymentId);

    List<Payment> findByRazorpayOrderIdOrderByIdDesc(String razorpayOrderId);

    Page<Payment> findAllByOrderByIdDesc(Pageable pageable);

    Page<Payment> findByStatusOrderByIdDesc(String status, Pageable pageable);

    /** One customer's payment history, attempts included. */
    List<Payment> findByOrderUserIdOrderByIdDesc(Long userId);

    Optional<Payment> findByIdAndOrderUserId(Long id, Long userId);

    long countByStatus(String status);

    /** Money actually taken. COALESCE so an empty table returns 0, not null. */
    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.status = :status")
    BigDecimal sumAmountByStatus(@Param("status") String status);

    /** Revenue per calendar month, newest first — drives the analytics chart. */
    @Query(value = """
            SELECT DATE_FORMAT(created_at, '%Y-%m') AS ym,
                   COUNT(*)                          AS payments,
                   COALESCE(SUM(amount), 0)          AS revenue
              FROM payment
             WHERE status = 'CAPTURED'
             GROUP BY ym
             ORDER BY ym DESC
             LIMIT 12
            """, nativeQuery = true)
    List<Object[]> monthlyRevenue();
}
