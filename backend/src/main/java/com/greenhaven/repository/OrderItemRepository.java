package com.greenhaven.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.greenhaven.entity.OrderItem;

public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {
    long countByPlantId(Long plantId);
}
