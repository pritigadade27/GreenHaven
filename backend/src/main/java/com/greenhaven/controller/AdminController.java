package com.greenhaven.controller;

import java.security.Principal;
import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;

import com.greenhaven.dto.AdminDtos;
import com.greenhaven.dto.ApiMessage;
import com.greenhaven.dto.PageResponse;
import com.greenhaven.service.AdminAuditService;
import com.greenhaven.service.AdminService;

/** The admin dashboard API. */
@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService admin;
    private final AdminAuditService audit;
    private final com.greenhaven.service.ReconciliationService reconciliation;

    public AdminController(AdminService admin, AdminAuditService audit,
                           com.greenhaven.service.ReconciliationService reconciliation) {
        this.admin = admin;
        this.audit = audit;
        this.reconciliation = reconciliation;
    }

    @GetMapping("/stats")
    public AdminDtos.Stats stats() {
        return admin.stats();
    }

    @GetMapping("/analytics")
    public AdminDtos.Analytics analytics() {
        return admin.analytics();
    }

    @GetMapping("/orders")
    public PageResponse<AdminDtos.OrderRow> orders(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String delivery,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return PageResponse.of(admin.orders(status, delivery, q, page, size));
    }

    @GetMapping("/orders/{id}")
    public AdminDtos.OrderDetail order(@PathVariable Long id) {
        return admin.order(id);
    }

    @PatchMapping("/orders/{id}/delivery-status")
    public AdminDtos.OrderRow updateDelivery(@PathVariable Long id,
                                             @RequestBody Map<String, String> body,
                                             Principal principal, HttpServletRequest http) {
        AdminDtos.OrderRow before = admin.order(id).summary();
        AdminDtos.OrderRow updated = admin.updateDeliveryStatus(id, body.get("status"));
        audit.record(principal.getName(), AdminAuditService.ORDER_STATUS_CHANGED,
                "ORDER", updated.orderNumber(),
                before.deliveryStatus() + " -> " + updated.deliveryStatus(), http);
        return updated;
    }

    /** The statuses the UI may offer, so the list lives in one place. */
    @GetMapping("/delivery-statuses")
    public List<String> deliveryStatuses() {
        return AdminService.DELIVERY_STATUSES.stream().sorted().toList();
    }

    @GetMapping("/payments")
    public PageResponse<AdminDtos.PaymentRow> payments(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return PageResponse.of(admin.payments(status, page, size));
    }

    @GetMapping("/users")
    public PageResponse<AdminDtos.UserRow> users(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return PageResponse.of(admin.users(q, page, size));
    }

    @PatchMapping("/users/{id}/blocked")
    public AdminDtos.UserRow setBlocked(@PathVariable Long id,
                                        @RequestBody Map<String, Boolean> body,
                                        Principal principal, HttpServletRequest http) {
        boolean blocked = Boolean.TRUE.equals(body.get("blocked"));
        AdminDtos.UserRow updated = admin.setBlocked(id, blocked);
        audit.record(principal.getName(),
                blocked ? AdminAuditService.USER_BLOCKED : AdminAuditService.USER_UNBLOCKED,
                "USER", String.valueOf(id), updated.email(), http);
        return updated;
    }

    @GetMapping("/inventory")
    public PageResponse<AdminDtos.InventoryRow> inventory(
            @RequestParam(required = false) String filter,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return PageResponse.of(admin.inventory(filter, q, page, size));
    }

    @PatchMapping("/inventory/{id}/stock")
    public AdminDtos.InventoryRow updateStock(@PathVariable Long id,
                                              @RequestBody Map<String, Integer> body,
                                              Principal principal, HttpServletRequest http) {
        AdminDtos.InventoryRow updated = admin.updateStock(id, body.get("stock"));
        audit.record(principal.getName(), AdminAuditService.INVENTORY_UPDATED,
                "PRODUCT", updated.slug(),
                "stock set to " + updated.stock() + " (" + updated.stockStatus() + ")", http);
        return updated;
    }

    /**
     * Runs the payment reconciliation sweep now rather than waiting for the
     * timer. Useful after a gateway outage, and it makes the sweep testable.
     */
    @PostMapping("/reconcile")
    public com.greenhaven.service.ReconciliationService.Result reconcile(
            Principal principal, HttpServletRequest http) {
        var result = reconciliation.reconcile();
        audit.record(principal.getName(), AdminAuditService.RECONCILED, "SYSTEM", "reconcile",
                result.examined() + " examined, " + result.settled() + " settled, "
                        + result.abandoned() + " abandoned", http);
        return result;
    }

    @GetMapping("/reviews")
    public PageResponse<AdminDtos.ReviewRow> reviews(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return PageResponse.of(admin.reviews(status, page, size));
    }

    @PatchMapping("/reviews/{id}/status")
    public ApiMessage setReviewStatus(@PathVariable Long id,
                                      @RequestBody Map<String, String> body,
                                      Principal principal, HttpServletRequest http) {
        admin.setReviewStatus(id, body.get("status"), body.get("reason"));
        audit.record(principal.getName(), AdminAuditService.REVIEW_MODERATED,
                "REVIEW", String.valueOf(id), "set to " + body.get("status"), http);
        return new ApiMessage("Review updated.");
    }

    @DeleteMapping("/reviews/{id}")
    public ApiMessage deleteReview(@PathVariable Long id,
                                   Principal principal, HttpServletRequest http) {
        admin.deleteReview(id);
        audit.record(principal.getName(), AdminAuditService.REVIEW_DELETED,
                "REVIEW", String.valueOf(id), "Review removed", http);
        return new ApiMessage("Review deleted.");
    }
}
