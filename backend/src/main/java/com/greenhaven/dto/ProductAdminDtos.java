package com.greenhaven.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public final class ProductAdminDtos {
    private ProductAdminDtos() {
    }

    public record ProductRow(
            Long id,
            String code,
            String slug,
            String name,
            String botanicalName,
            String categorySlug,
            String categoryName,
            BigDecimal price,
            BigDecimal mrp,
            Integer stock,
            String image,
            String shortDescription,
            String description,
            String careTip,
            String petSafety,
            String difficulty,
            String light,
            String water,
            boolean featured,
            boolean bestSeller,
            boolean newArrival,
            boolean discontinued,
            BigDecimal rating,
            Integer reviewCount) {
    }

    public record ProductRequest(
            @NotBlank(message = "A name is required.")
            @Size(max = 150, message = "Keep the name under 150 characters.")
            String name,

            @Size(max = 120) String slug,

            @Size(max = 150) String botanicalName,

            @NotBlank(message = "Choose a category.") String categorySlug,

            @NotNull(message = "A price is required.")
            @DecimalMin(value = "1.0", message = "The price must be at least Rs 1.")
            BigDecimal price,

            @DecimalMin(value = "0.0", message = "The MRP cannot be negative.")
            BigDecimal mrp,

            @Min(value = 0, message = "Stock cannot be negative.")
            @Max(value = 100000, message = "That is more stock than the nursery can hold.")
            Integer stock,

            @Size(max = 255) String image,
            @Size(max = 400) String shortDescription,
            String description,
            @Size(max = 400) String careTip,

            @NotBlank String petSafety,
            @NotBlank String difficulty,
            @NotBlank String light,
            @NotBlank String water,

            Boolean featured,
            Boolean bestSeller,
            Boolean newArrival,
            Boolean discontinued) {
    }

    public record DeleteOutcome(boolean deleted, boolean discontinued, String message) {
    }

    public record UploadResult(String url) {
    }
}
