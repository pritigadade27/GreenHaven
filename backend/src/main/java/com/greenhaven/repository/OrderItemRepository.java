package com.greenhaven.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.greenhaven.entity.OrderItem;

public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {

    /** How many order lines refer to a product. */
    long countByPlantId(Long plantId);
}
