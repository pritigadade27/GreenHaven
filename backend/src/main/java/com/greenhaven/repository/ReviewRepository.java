package com.greenhaven.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.greenhaven.model.Review;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    Page<Review> findAllByOrderByIdDesc(Pageable pageable);

    Page<Review> findByStatusOrderByIdDesc(String status, Pageable pageable);

    long countByStatus(String status);
}
