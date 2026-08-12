package com.greenhaven.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class AdminDtos {
    private AdminDtos() { }

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
            String stockStatus,
            boolean featured,
            boolean bestSeller,
            boolean newArrival) {
    }

    public record ReviewRow(
            Long id,
            String productName,
            String productSlug,
            String customerName,
            String customerEmail,
            BigDecimal rating,
            String title,
            String body,
            String status,
            String hiddenReason,
            boolean verifiedPurchase,
            String orderNumber,
            Instant createdAt,
            Instant updatedAt,
            List<String> images) {
    }

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
