package com.greenhaven.controller;

import java.security.Principal;
import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.greenhaven.dto.BasketDto;
import com.greenhaven.service.BasketService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/basket")
public class BasketController {
    private final BasketService baskets;

    public BasketController(BasketService baskets) {
        this.baskets = baskets;
    }

    @GetMapping("/cart")
    public List<BasketDto.Line> cart(Principal principal) {
        return baskets.cart(principal.getName());
    }

    @PutMapping("/cart")
    public List<BasketDto.Line> saveCart(@Valid @RequestBody BasketDto.Basket body,
                                         Principal principal) {
        return baskets.replaceCart(principal.getName(), body.items());
    }

    @GetMapping("/wishlist")
    public List<String> wishlist(Principal principal) {
        return baskets.wishlist(principal.getName());
    }

    @PutMapping("/wishlist")
    public List<String> saveWishlist(@RequestBody Map<String, List<String>> body,
                                     Principal principal) {
        return baskets.replaceWishlist(principal.getName(),
                body.getOrDefault("slugs", List.of()));
    }
}
