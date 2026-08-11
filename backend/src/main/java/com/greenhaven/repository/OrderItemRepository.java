package com.greenhaven.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.greenhaven.model.OrderItem;

public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {

    /**
     * How many order lines refer to a product. Non-zero means it has been sold
     * and must never be deleted — the order history points at it.
     */
    long countByPlantId(Long plantId);
}
