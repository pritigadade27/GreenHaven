package com.greenhaven.service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.greenhaven.dto.BasketDto;
import com.greenhaven.exception.ResourceNotFoundException;
import com.greenhaven.entity.AppUser;
import com.greenhaven.entity.CartItem;
import com.greenhaven.entity.Plant;
import com.greenhaven.entity.WishlistItem;
import com.greenhaven.repository.AppUserRepository;
import com.greenhaven.repository.CartItemRepository;
import com.greenhaven.repository.PlantRepository;
import com.greenhaven.repository.WishlistItemRepository;

@Service
public class BasketService {
    private static final org.slf4j.Logger log =
            org.slf4j.LoggerFactory.getLogger(BasketService.class);

    private final CartItemRepository carts;
    private final WishlistItemRepository wishlists;
    private final PlantRepository plants;
    private final AppUserRepository users;

    public BasketService(CartItemRepository carts, WishlistItemRepository wishlists,
                         PlantRepository plants, AppUserRepository users) {
        this.carts = carts;
        this.wishlists = wishlists;
        this.plants = plants;
        this.users = users;
    }

    @Transactional(readOnly = true)
    public List<BasketDto.Line> cart(String email) {
        return carts.findByUserId(user(email).getId()).stream()
                .map(item -> new BasketDto.Line(item.getPlant().getSlug(), item.getQuantity()))
                .toList();
    }

    @Transactional
    public List<BasketDto.Line> replaceCart(String email, List<BasketDto.Line> lines) {
        AppUser owner = user(email);
        // Replace whole cart
        carts.deleteByUserId(owner.getId());
        carts.flush();

        List<CartItem> rows = merge(lines).entrySet().stream()
                .map(entry -> {
                    // Skip unknown plants
                    Plant plant = plants.findBySlug(entry.getKey()).orElse(null);
                    if (plant == null) return null;
                    CartItem item = new CartItem();
                    item.setUser(owner);
                    item.setPlant(plant);
                    item.setQuantity(entry.getValue());
                    return item;
                })
                .filter(java.util.Objects::nonNull)
                .toList();

        carts.saveAll(rows);
        return rows.stream()
                .map(r -> new BasketDto.Line(r.getPlant().getSlug(), r.getQuantity()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<String> wishlist(String email) {
        return wishlists.findByUserId(user(email).getId()).stream()
                .map(item -> item.getPlant().getSlug())
                .toList();
    }

    @Transactional
    public List<String> replaceWishlist(String email, List<String> slugs) {
        AppUser owner = user(email);
        wishlists.deleteByUserId(owner.getId());
        wishlists.flush();

        List<WishlistItem> rows = slugs.stream().distinct()
                .map(slug -> {
                    Plant plant = plants.findBySlug(slug).orElse(null);
                    if (plant == null) return null;
                    WishlistItem item = new WishlistItem();
                    item.setUser(owner);
                    item.setPlant(plant);
                    return item;
                })
                .filter(java.util.Objects::nonNull)
                .toList();

        wishlists.saveAll(rows);
        return rows.stream().map(r -> r.getPlant().getSlug()).toList();
    }

    @Transactional
    public void clearCartQuietly(Long userId) {
        try {
            carts.deleteByUserId(userId);
        } catch (RuntimeException e) {
            log.warn("Could not clear the cart for user {}: {}", userId, e.getMessage());
        }
    }

    // Merge duplicates, clamp quantity
    private static Map<String, Integer> merge(List<BasketDto.Line> lines) {
        Map<String, Integer> wanted = new LinkedHashMap<>();
        if (lines == null) return wanted;
        lines.forEach(line ->
                wanted.merge(line.slug(), Math.max(1, Math.min(99, line.quantity())), Integer::sum));
        wanted.replaceAll((slug, qty) -> Math.min(99, qty));
        return wanted;
    }

    private AppUser user(String email) {
        return users.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Not signed in."));
    }
}
