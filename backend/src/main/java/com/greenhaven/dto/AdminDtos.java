package com.greenhaven.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/** The shapes the admin dashboard consumes. */
public final class AdminDtos {

    private AdminDtos() { }

    /** The dashboard stat cards. Every figure is counted in SQL, never guessed. */
    public record Stats(
            long totalProducts,
            long totalCategories,
            long totalUsers,
            long totalOrders,
            BigDecimal totalRevenue,
            long successfulPayments,
            long failedPayments,
            long pendingOrders,
            long cancelledOrders,
            long lowStockProducts,
            long outOfStockProducts,
            long totalReviews,
            long newsletterSubscribers) {
    }

    /** One row of the orders table. */
    public record OrderRow(
            Long id,
            String orderNumber,
            String invoiceNumber,
            String customerName,
            String customerEmail,
            String phone,
            String status,
            String deliveryStatus,
            BigDecimal total,
            Instant placedAt,
            int itemCount) {
    }

    /** A full order, for the detail drawer. */
    public record OrderDetail(
            OrderRow summary,
            String addressLine,
            String city,
            String state,
            String pincode,
            String country,
            BigDecimal subtotal,
            BigDecimal shipping,
            BigDecimal tax,
            BigDecimal discount,
            List<Line> items,
            List<PaymentRow> payments) {

        public record Line(String name, String image, String category,
                           int quantity, BigDecimal unitPrice, BigDecimal subtotal) {
        }
    }

    public record PaymentRow(
            Long id,
            String orderNumber,
            String invoiceNumber,
            String customerName,
            String razorpayOrderId,
            String razorpayPaymentId,
            String method,
            String currency,
            BigDecimal amount,
            String status,
            String verificationStatus,
            String refundStatus,
            String failureReason,
            Instant createdAt) {
    }

    public record UserRow(
            Long id,
            String fullName,
            String email,
            String phone,
            String role,
            boolean blocked,
            Instant registeredAt,
            long totalOrders,
            BigDecimal totalSpent) {
    }

    public record InventoryRow(
            Long id,
            String code,
            String slug,
            String name,
            String image,
            String category,
            BigDecimal price,
            Integer stock,
            /** Derived, never stored: OUT_OF_STOCK, LOW_STOCK or IN_STOCK. */
            String stockStatus,
            boolean featured,
            boolean bestSeller,
            boolean newArrival) {
    }

    public record ReviewRow(
            Long id,
            String productName,
            String customerName,
            int rating,
            String title,
            String body,
            String status,
            Instant createdAt) {
    }

    /** One month of takings, for the revenue chart. */
    public record MonthlyPoint(String month, long orders, BigDecimal revenue) {
    }

    public record TopProduct(String name, String category, long unitsSold, BigDecimal revenue) {
    }

    public record Analytics(
            List<MonthlyPoint> monthly,
            List<TopProduct> topProducts,
            List<TopProduct> topCategories) {
    }
}
