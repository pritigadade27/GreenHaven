package com.greenhaven.controller;

import java.security.Principal;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.greenhaven.dto.CouponDtos;
import com.greenhaven.service.CouponService;

import jakarta.validation.Valid;

/**
 * Trying a discount code against a basket.
 *
 *   POST /api/coupons/quote   what would this code do to this basket?
 *
 * A POST rather than a GET because the basket goes in the body, and because a
 * code in a query string ends up in browser history and server logs.
 *
 * There is deliberately no endpoint that lists available codes: a shop hands
 * out a code to the people it means to have it, and an endpoint enumerating
 * every live discount would make that meaningless.
 */
@RestController
@RequestMapping("/api/coupons")
public class CouponController {

    private final CouponService coupons;

    public CouponController(CouponService coupons) {
        this.coupons = coupons;
    }

    @PostMapping("/quote")
    public CouponDtos.QuoteResponse quote(Principal principal,
                                          @Valid @RequestBody CouponDtos.QuoteRequest body) {
        return coupons.quote(principal.getName(), body);
    }
}
