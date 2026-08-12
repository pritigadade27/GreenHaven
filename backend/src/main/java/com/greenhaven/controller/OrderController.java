package com.greenhaven.controller;

import java.security.Principal;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.greenhaven.dto.ApiMessage;
import com.greenhaven.dto.CheckoutRequest;
import com.greenhaven.dto.OrderDto;
import com.greenhaven.dto.PaymentVerificationRequest;
import com.greenhaven.service.OrderService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/orders")
public class OrderController {
    private final OrderService orders;

    public OrderController(OrderService orders) {
        this.orders = orders;
    }

    @PostMapping
    public ResponseEntity<OrderDto> checkout(Principal principal,
                                             @Valid @RequestBody CheckoutRequest request)
            throws Exception {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(orders.startCheckout(principal.getName(), request));
    }

    @PostMapping("/verify")
    public OrderDto verify(Principal principal,
                           @Valid @RequestBody PaymentVerificationRequest request) {
        return orders.confirmPayment(principal.getName(), request);
    }

    @PostMapping("/{razorpayOrderId}/simulate")
    public PaymentVerificationRequest simulate(Principal principal,
                                               @PathVariable String razorpayOrderId,
                                               @RequestParam(defaultValue = "true") boolean succeed) {
        return orders.simulateGateway(principal.getName(), razorpayOrderId, succeed);
    }

    @PostMapping("/{razorpayOrderId}/cancel")
    public ApiMessage cancel(Principal principal, @PathVariable String razorpayOrderId) {
        boolean cancelled = orders.markCancelled(principal.getName(), razorpayOrderId);
        return new ApiMessage(cancelled
                ? "Payment cancelled. Nothing has been charged."
                : "That order is no longer awaiting payment.");
    }

    @GetMapping
    public List<OrderDto> myOrders(Principal principal) {
        return orders.myOrders(principal.getName());
    }
}
