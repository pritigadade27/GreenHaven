package com.greenhaven.service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.greenhaven.entity.Invoice;
import com.greenhaven.entity.Order;
import com.greenhaven.repository.InvoiceRepository;

/** The document ledger: what was charged, and what was owed back. */
@Service
public class InvoiceService {

    private static final Logger log = LoggerFactory.getLogger(InvoiceService.class);

    private final InvoiceRepository invoices;
    private final DocumentNumberService documents;

    public InvoiceService(InvoiceRepository invoices, DocumentNumberService documents) {
        this.invoices = invoices;
        this.documents = documents;
    }

    /** Records the invoice for an order that has just been paid. */
    @Transactional
    public Invoice issueFor(Order order, String number) {
        if (invoices.existsByOrderIdAndDocType(order.getId(), Invoice.INVOICE)) {
            return invoices.findByOrderIdOrderByIdAsc(order.getId()).stream()
                    .filter(i -> Invoice.INVOICE.equals(i.getDocType()))
                    .findFirst()
                    .orElseThrow();
        }

        Invoice invoice = new Invoice();
        invoice.setNumber(number);
        invoice.setDocType(Invoice.INVOICE);
        invoice.setOrder(order);
        invoice.setAmount(order.getTotal());
        invoice.setIssuedAt(Instant.now());
        return invoices.save(invoice);
    }

    /** Issues a credit note against an order that was paid and then cancelled. */
    @Transactional
    public Optional<Invoice> creditNoteFor(Order order, String reason) {
        boolean paid = "PAID".equals(order.getStatus()) || "PAID_SHORT".equals(order.getStatus());
        if (!paid) return Optional.empty();

        if (!invoices.existsByOrderIdAndDocType(order.getId(), Invoice.INVOICE)) {
            // Paid but with no invoice recorded — an order settled before this ledger existed and not caught.
            log.warn("Order {} is paid but has no invoice; no credit note issued.",
                    order.getOrderNumber());
            return Optional.empty();
        }
        if (invoices.existsByOrderIdAndDocType(order.getId(), Invoice.CREDIT_NOTE)) {
            return invoices.findByOrderIdOrderByIdAsc(order.getId()).stream()
                    .filter(Invoice::isCreditNote)
                    .findFirst();
        }

        Invoice note = new Invoice();
        note.setNumber(documents.nextCreditNoteNumber());
        note.setDocType(Invoice.CREDIT_NOTE);
        note.setOrder(order);
        // The whole order.
        note.setAmount(order.getTotal() == null ? BigDecimal.ZERO : order.getTotal());
        note.setReason(reason == null || reason.isBlank() ? "Order cancelled" : reason.trim());
        note.setIssuedAt(Instant.now());

        Invoice saved = invoices.save(note);
        log.info("Credit note {} issued against order {} for {}.",
                saved.getNumber(), order.getOrderNumber(), saved.getAmount());
        return Optional.of(saved);
    }

    @Transactional(readOnly = true)
    public List<Invoice> forOrder(Long orderId) {
        return invoices.findByOrderIdOrderByIdAsc(orderId);
    }

    @Transactional(readOnly = true)
    public List<Invoice> forUser(Long userId) {
        return invoices.findForUser(userId);
    }

    @Transactional(readOnly = true)
    public Optional<Invoice> byNumber(String number) {
        return invoices.findByNumber(number);
    }
}
