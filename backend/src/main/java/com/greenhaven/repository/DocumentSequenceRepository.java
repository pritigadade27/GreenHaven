package com.greenhaven.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.greenhaven.model.DocumentSequence;

import jakarta.persistence.LockModeType;

public interface DocumentSequenceRepository
        extends JpaRepository<DocumentSequence, DocumentSequence.Key> {

    /**
     * Reads the counter with a row-level write lock.
     *
     * Without the lock two concurrent checkouts read the same next_value and
     * both mint the same order number, which the UNIQUE constraint then rejects
     * as a 500 — after Razorpay has already been called.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT d FROM DocumentSequence d WHERE d.name = :name AND d.year = :year")
    Optional<DocumentSequence> lock(@Param("name") String name, @Param("year") Integer year);
}
