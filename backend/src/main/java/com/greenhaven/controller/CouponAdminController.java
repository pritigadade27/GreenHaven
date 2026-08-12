package com.greenhaven.controller;

import java.security.Principal;

import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.greenhaven.dto.CouponDtos;
import com.greenhaven.service.AdminAuditService;
import com.greenhaven.service.CouponAdminService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/admin/coupons")
@PreAuthorize("hasRole('ADMIN')")
public class CouponAdminController {
    private final CouponAdminService coupons;
    private final AdminAuditService audit;

    public CouponAdminController(CouponAdminService coupons, AdminAuditService audit) {
        this.coupons = coupons;
        this.audit = audit;
    }

    @GetMapping
    public Page<CouponDtos.CouponRow> list(@RequestParam(defaultValue = "0") int page,
                                           @RequestParam(defaultValue = "25") int size) {
        return coupons.list(page, size);
    }

    @PostMapping
    public ResponseEntity<CouponDtos.CouponRow> create(
            Principal principal, @Valid @RequestBody CouponDtos.CouponRequest body,
            HttpServletRequest http) {
        CouponDtos.CouponRow row = coupons.create(body);
        audit.record(principal.getName(), AdminAuditService.COUPON_ADDED, "COUPON",
                String.valueOf(row.id()), describe(row), http);
        return ResponseEntity.status(HttpStatus.CREATED).body(row);
    }

    @PutMapping("/{id}")
    public CouponDtos.CouponRow update(Principal principal, @PathVariable Long id,
                                       @Valid @RequestBody CouponDtos.CouponRequest body,
                                       HttpServletRequest http) {
        CouponDtos.CouponRow row = coupons.update(id, body);
        audit.record(principal.getName(), AdminAuditService.COUPON_UPDATED, "COUPON",
                String.valueOf(id), describe(row), http);
        return row;
    }

    @PatchMapping("/{id}/state")
    public CouponDtos.CouponRow setActive(Principal principal, @PathVariable Long id,
                                          @RequestParam boolean active, HttpServletRequest http) {
        CouponDtos.CouponRow row = coupons.setActive(id, active);
        audit.record(principal.getName(), AdminAuditService.COUPON_UPDATED, "COUPON",
                String.valueOf(id), row.code() + (active ? " turned on" : " turned off"), http);
        return row;
    }

    private static String describe(CouponDtos.CouponRow row) {
        String amount = "PERCENT".equals(row.discountType())
                ? row.discountValue().stripTrailingZeros().toPlainString() + "%"
                : "₹" + row.discountValue().stripTrailingZeros().toPlainString();
        return row.code() + " — " + amount + " off";
    }
}
