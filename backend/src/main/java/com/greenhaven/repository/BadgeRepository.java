package com.greenhaven.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.greenhaven.model.Badge;

public interface BadgeRepository extends JpaRepository<Badge, Long> {

    Optional<Badge> findByCode(String code);
}
