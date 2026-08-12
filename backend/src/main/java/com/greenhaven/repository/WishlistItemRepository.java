package com.greenhaven.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.greenhaven.entity.WishlistItem;

public interface WishlistItemRepository extends JpaRepository<WishlistItem, Long> {

    List<WishlistItem> findByUserId(Long userId);

    void deleteByUserId(Long userId);
}
