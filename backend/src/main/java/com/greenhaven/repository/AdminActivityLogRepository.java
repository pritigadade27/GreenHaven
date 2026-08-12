package com.greenhaven.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.greenhaven.entity.AdminActivityLog;

public interface AdminActivityLogRepository extends JpaRepository<AdminActivityLog, Long> {

    Page<AdminActivityLog> findAllByOrderByIdDesc(Pageable pageable);

    Page<AdminActivityLog> findByActionOrderByIdDesc(String action, Pageable pageable);
}
