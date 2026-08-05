package com.greenhaven.repository;

import java.math.BigDecimal;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.greenhaven.model.Order;

public interface OrderRepository extends JpaRepository<Order, Long> {

    Optional<Order> findByRazorpayOrderId(String razorpayOrderId);

    Optional<Order> findByOrderNumber(String orderNumber);

    /** See AppUserRepository: the collation already ignores case. */
    List<Order> findByUserEmailOrderByIdDesc(String email);

    long countByStatus(String status);

    long countByUserId(Long userId);

    /** Lifetime spend — PAID only, so abandoned checkouts do not inflate it. */
    @Query("SELECT COALESCE(SUM(o.total), 0) FROM Order o "
         + "WHERE o.user.id = :userId AND o.status = 'PAID'")
    BigDecimal sumPaidTotalByUserId(@Param("userId") Long userId);

    /** The admin orders table. */
    @Query("""
            SELECT o FROM Order o
            WHERE (:status   IS NULL OR o.status = :status)
              AND (:delivery IS NULL OR o.deliveryStatus = :delivery)
              AND (:q IS NULL
                   OR LOWER(o.orderNumber)     LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(o.invoiceNumber)   LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(o.user.fullName)   LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(o.user.email)      LIKE LOWER(CONCAT('%', :q, '%')))
            ORDER BY o.id DESC
            """)
    Page<Order> searchForAdmin(@Param("status") String status,
                               @Param("delivery") String delivery,
                               @Param("q") String q,
                               Pageable pageable);

    /** Best sellers by units actually shipped. */
    @Query(value = """
            SELECT oi.product_name, oi.product_category,
                   SUM(oi.quantity)                    AS units,
                   SUM(oi.quantity * oi.unit_price)    AS revenue
              FROM order_item oi
              JOIN orders o ON o.id = oi.order_id
             WHERE o.status = 'PAID'
             GROUP BY oi.product_name, oi.product_category
             ORDER BY units DESC
             LIMIT 10
            """, nativeQuery = true)
    List<Object[]> topProducts();

    @Query(value = """
            SELECT COALESCE(oi.product_category, 'Uncategorised') AS cat,
                   SUM(oi.quantity)                               AS units,
                   SUM(oi.quantity * oi.unit_price)               AS revenue
              FROM order_item oi
              JOIN orders o ON o.id = oi.order_id
             WHERE o.status = 'PAID'
             GROUP BY cat
             ORDER BY revenue DESC
             LIMIT 10
            """, nativeQuery = true)
    List<Object[]> topCategories();
}
