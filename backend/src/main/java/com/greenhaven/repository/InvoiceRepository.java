package com.greenhaven.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.greenhaven.entity.Invoice;

public interface InvoiceRepository extends JpaRepository<Invoice, Long> {
    Optional<Invoice> findByNumber(String number);

    List<Invoice> findByOrderIdOrderByIdAsc(Long orderId);

    boolean existsByOrderIdAndDocType(Long orderId, String docType);

    @Query("""
            SELECT i FROM Invoice i
             WHERE i.order.user.id = :userId
             ORDER BY i.issuedAt DESC, i.id DESC
            """)
    List<Invoice> findForUser(@Param("userId") Long userId);
}
