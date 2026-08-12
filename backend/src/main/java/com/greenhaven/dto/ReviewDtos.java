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

/** Ratings and reviews, as the storefront sees them. */
public final class ReviewDtos {

    private ReviewDtos() {
    }

    /** One review on a product page. Carries no email — reviews are public. */
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
            /** Customer photographs, in the order they were attached. */
            List<String> images) {
    }

    /** Everything above the review list: the average, how many, and how the stars are distributed. */
    public record Summary(
            String slug,
            BigDecimal average,
            long total,
            Map<Integer, Long> breakdown) {
    }

    /** Whether the signed-in customer may write, and why not if they may not. */
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

            /** Paths returned by POST /api/reviews/image. */
            @Size(max = 4, message = "You can attach up to 4 photographs.")
            List<String> images) {
    }

    /** The path a freshly uploaded review photograph was stored at. */
    public record UploadedImage(String url) {
    }

    /** A page of reviews plus the summary, so the page needs one request. */
    public record ReviewPage(
            Summary summary,
            List<ReviewDto> reviews,
            int page,
            int size,
            long totalPages,
            boolean hasMore) {
    }
}
