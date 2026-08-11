package com.greenhaven.service;

import java.time.Year;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.greenhaven.model.DocumentSequence;
import com.greenhaven.repository.DocumentSequenceRepository;

/** Mints human-readable, per-year, gapless order and invoice numbers. */
@Service
public class DocumentNumberService {

    private static final String ORDER = "ORDER";
    private static final String INVOICE = "INVOICE";
    private static final String CREDIT_NOTE = "CREDIT_NOTE";

    private final DocumentSequenceRepository sequences;

    public DocumentNumberService(DocumentSequenceRepository sequences) {
        this.sequences = sequences;
    }

    /**
     * GH + year + 5 digits, e.g. GH202600001.
     *
     * The transaction annotation is on the PUBLIC method, not on a private
     * helper: Spring's proxy only intercepts calls that arrive from outside the
     * bean, so a self-invoked @Transactional method silently runs in the
     * caller's transaction and REQUIRES_NEW does nothing at all.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public String nextOrderNumber() {
        int year = Year.now().getValue();
        return "GH" + year + String.format("%05d", next(ORDER, year));
    }

    /** INV-GH-year-5 digits, e.g. INV-GH-2026-00001. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public String nextInvoiceNumber() {
        int year = Year.now().getValue();
        return "INV-GH-" + year + "-" + String.format("%05d", next(INVOICE, year));
    }

    /**
     * CRN-GH-year-5 digits, e.g. CRN-GH-2026-00001.
     *
     * A series of its own, not a continuation of the invoice numbers. Mixing
     * them would leave gaps in the invoice sequence wherever a credit note was
     * issued, and a gapless invoice series is the point of keeping a counter
     * rather than counting rows.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public String nextCreditNoteNumber() {
        int year = Year.now().getValue();
        return "CRN-GH-" + year + "-" + String.format("%05d", next(CREDIT_NOTE, year));
    }

    /**
     * Allocates the next value.
     *
     * Runs inside the REQUIRES_NEW transaction opened by its public caller, so
     * the lock on the counter row is released as soon as that returns rather
     * than being held for the rest of a checkout — which includes a call out to
     * Razorpay that can take seconds. Holding it that long would serialise
     * every checkout in the shop behind a single row.
     */
    private long next(String name, int year) {
        DocumentSequence seq = sequences.lock(name, year).orElseGet(() -> {
            // First document of a new year. saveAndFlush so a concurrent caller
            // hits the primary key rather than creating a second row.
            DocumentSequence fresh = new DocumentSequence(name, year, 1L);
            return sequences.saveAndFlush(fresh);
        });

        long value = seq.getNextValue();
        seq.setNextValue(value + 1);
        sequences.save(seq);
        return value;
    }
}
