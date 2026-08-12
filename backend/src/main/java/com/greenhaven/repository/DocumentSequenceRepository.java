package com.greenhaven.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.greenhaven.entity.DocumentSequence;

import jakarta.persistence.LockModeType;

public interface DocumentSequenceRepository
        extends JpaRepository<DocumentSequence, DocumentSequence.Key> {

    /** Reads the counter with a row-level write lock. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT d FROM DocumentSequence d WHERE d.name = :name AND d.year = :year")
    Optional<DocumentSequence> lock(@Param("name") String name, @Param("year") Integer year);
}
