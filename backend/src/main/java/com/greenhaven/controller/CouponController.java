package com.greenhaven.controller;

import java.security.Principal;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.greenhaven.dto.CouponDtos;
import com.greenhaven.service.CouponService;

import jakarta.validation.Valid;

/** Trying a discount code against a basket. */
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
