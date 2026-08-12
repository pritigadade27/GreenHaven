package com.greenhaven.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public final class ReviewDtos {
    private ReviewDtos() {
    }

    public record ReviewDto(
            Long id,
            String author,
            BigDecimal rating,
            String title,
            String body,
            boolean verifiedPurchase,
            Instant createdAt,
            Instant updatedAt,
            boolean mine,
            List<String> images) {
    }

    public record Summary(
            String slug,
            BigDecimal average,
            long total,
            Map<Integer, Long> breakdown) {
    }

    public record Eligibility(
            boolean canReview,
            String reason,
            String orderNumber,
            boolean alreadyReviewed,
            ReviewDto existing) {
    }

    public record WriteRequest(
            @NotNull(message = "Choose a rating.")
            @DecimalMin(value = "0.5", message = "Ratings run from half a star to 5.")
            @DecimalMax(value = "5.0", message = "Ratings run from half a star to 5.")
            BigDecimal rating,

            @Size(max = 150, message = "Keep the title under 150 characters.")
            String title,

            @NotBlank(message = "Tell other customers what you thought.")
            @Size(min = 10, max = 2000, message = "Use between 10 and 2000 characters.")
            String body,

            @Size(max = 4, message = "You can attach up to 4 photographs.")
            List<String> images) {
    }

    public record UploadedImage(String url) {
    }

    public record ReviewPage(
            Summary summary,
            List<ReviewDto> reviews,
            int page,
            int size,
            long totalPages,
            boolean hasMore) {
    }
}
