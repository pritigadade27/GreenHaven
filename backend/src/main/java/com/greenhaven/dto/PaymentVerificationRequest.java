package com.greenhaven.dto;

import jakarta.validation.constraints.NotBlank;

/** Exactly what Razorpay hands back to the browser after a payment. */
public record PaymentVerificationRequest(
        @NotBlank String razorpayOrderId,
        @NotBlank String razorpayPaymentId,
        @NotBlank String razorpaySignature) {
}
