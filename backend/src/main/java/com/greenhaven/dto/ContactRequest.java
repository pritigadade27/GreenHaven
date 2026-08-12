package com.greenhaven.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ContactRequest(
        @NotBlank(message = "Name is required") @Size(max = 120) String name,
        @NotBlank @Email(message = "Enter a valid email address") String email,
        @Size(max = 200) String subject,
        // A max as well as a min: the column is TEXT, so anything past 64 KB fails at the database as an.
        @NotBlank(message = "Message is required")
        @Size(min = 10, max = 4000, message = "Please keep it under 4000 characters")
        String message) {
}
