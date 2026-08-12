package com.greenhaven.repository;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;

import com.greenhaven.entity.AppUser;

public interface AppUserRepository extends JpaRepository<AppUser, Long> {
    Optional<AppUser> findByEmail(String email);

    boolean existsByEmail(String email);

    @Query("""
            SELECT u FROM AppUser u
            WHERE (:q IS NULL
                   OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(u.email)    LIKE LOWER(CONCAT('%', :q, '%')))
            ORDER BY u.id DESC
            """)
    Page<AppUser> searchForAdmin(@Param("q") String q, Pageable pageable);
}
