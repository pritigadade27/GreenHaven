package com.greenhaven.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.greenhaven.model.AdminSession;

public interface AdminSessionRepository extends JpaRepository<AdminSession, Long> {

    Optional<AdminSession> findByJti(String jti);

    List<AdminSession> findByUserIdAndRevokedFalse(Long userId);
}
