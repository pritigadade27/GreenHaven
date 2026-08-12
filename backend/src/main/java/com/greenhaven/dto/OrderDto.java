package com.greenhaven.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import com.greenhaven.entity.Order;

/** An order as the client may see it. */
public record OrderDto(
        String orderNumber,
        String invoiceNumber,
        String deliveryStatus,
        String status,
        BigDecimal subtotal,
        BigDecimal discount,
        String couponCode,
        BigDecimal shipping,
        BigDecimal tax,
        BigDecimal total,
        String razorpayOrderId,
        String razorpayPaymentId,
        String razorpayKeyId,
        boolean simulated,
        String currency,
        String addressLine,
        String phone,
        String city,
        String state,
        String pincode,
        Instant placedAt,
        List<Line> items) {

    public record Line(String slug, String name, int quantity, BigDecimal unitPrice) {
    }

    public static OrderDto from(Order o, String keyId) {
        return from(o, keyId, false);
    }

    public static OrderDto from(Order o, String keyId, boolean simulated) {
        return new OrderDto(
                o.getOrderNumber(), o.getInvoiceNumber(), o.getDeliveryStatus(), o.getStatus(), o.getSubtotal(), o.getDiscount(), o.getCouponCode(),
                o.getShipping(), o.getTax(), o.getTotal(),
                o.getRazorpayOrderId(), o.getRazorpayPaymentId(), keyId, simulated, "INR",
                o.getAddressLine(), o.getPhone(), o.getCity(), o.getState(), o.getPincode(), o.getPlacedAt(),
                o.getItems().stream()
                        .map(i -> new Line(i.getPlant().getSlug(), i.getPlant().getName(),
                                i.getQuantity(), i.getUnitPrice()))
                        .toList());
    }
}
