package com.greenhaven.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record NewsletterRequest(
        @NotBlank @Email(message = "Enter a valid email address") String email) {
}
