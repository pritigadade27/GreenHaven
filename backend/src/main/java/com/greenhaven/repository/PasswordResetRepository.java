package com.greenhaven.repository;

import java.time.Instant;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.greenhaven.model.PasswordReset;

public interface PasswordResetRepository extends JpaRepository<PasswordReset, Long> {

    Optional<PasswordReset> findByTokenHash(String tokenHash);

    /**
     * Retires every outstanding token for one account.
     *
     * Called when a new reset is requested, so an older link — forwarded, or
     * sitting in a mailbox someone else can read — stops working immediately.
     */
    @Modifying
    @Query("UPDATE PasswordReset r SET r.usedAt = :now "
            + "WHERE r.user.id = :userId AND r.usedAt IS NULL")
    int markAllUsedFor(@Param("userId") Long userId, @Param("now") Instant now);
}
