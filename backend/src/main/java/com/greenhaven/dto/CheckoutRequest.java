package com.greenhaven.dto;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Positive;

public record CheckoutRequest(
        @NotBlank(message = "Address is required")
        @Size(max = 255, message = "Please shorten the address")
        String addressLine,

        @NotBlank(message = "A phone number is required for delivery")
        @Pattern(regexp = "^([+]?91[- ]?|0)?[6-9][0-9]{9}$",
                 message = "Enter a 10-digit Indian mobile number")
        String phone,
        @NotBlank(message = "City is required")
        @Size(max = 80, message = "Please shorten the city")
        String city,
        @NotBlank(message = "State is required")
        @Size(max = 80, message = "Please shorten the state")
        String state,
        @NotBlank(message = "Pincode is required")
        @Pattern(regexp = "[0-9]{6}", message = "Enter a 6-digit pincode") String pincode,
        @NotEmpty(message = "Your cart is empty")
        @Size(max = 50, message = "An order can hold up to 50 different products")
        @Valid List<Line> items,

        @Size(max = 40, message = "That is not a code we issue.")
        String couponCode) {
    public record Line(
            @NotBlank String slug,
            @Positive(message = "Quantity must be at least 1")
            @Max(value = 99, message = "Quantity is limited to 99 per product")
            int quantity) {
    }
}
