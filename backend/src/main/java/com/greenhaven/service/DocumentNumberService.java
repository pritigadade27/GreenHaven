package com.greenhaven.service;

import java.time.Year;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.greenhaven.entity.DocumentSequence;
import com.greenhaven.repository.DocumentSequenceRepository;

@Service
public class DocumentNumberService {
    private static final String ORDER = "ORDER";
    private static final String INVOICE = "INVOICE";
    private static final String CREDIT_NOTE = "CREDIT_NOTE";

    private final DocumentSequenceRepository sequences;

    public DocumentNumberService(DocumentSequenceRepository sequences) {
        this.sequences = sequences;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public String nextOrderNumber() {
        int year = Year.now().getValue();
        return "GH" + year + String.format("%05d", next(ORDER, year));
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public String nextInvoiceNumber() {
        int year = Year.now().getValue();
        return "INV-GH-" + year + "-" + String.format("%05d", next(INVOICE, year));
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public String nextCreditNoteNumber() {
        int year = Year.now().getValue();
        return "CRN-GH-" + year + "-" + String.format("%05d", next(CREDIT_NOTE, year));
    }

    private long next(String name, int year) {
        DocumentSequence seq = sequences.lock(name, year).orElseGet(() -> {
            DocumentSequence fresh = new DocumentSequence(name, year, 1L);
            return sequences.saveAndFlush(fresh);
        });

        long value = seq.getNextValue();
        seq.setNextValue(value + 1);
        sequences.save(seq);
        return value;
    }
}
