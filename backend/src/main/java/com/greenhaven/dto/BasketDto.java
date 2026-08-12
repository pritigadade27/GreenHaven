package com.greenhaven.dto;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/** What the browser sends and receives for a saved cart or wishlist. */
public final class BasketDto {

    private BasketDto() { }

    public record Line(
            @NotBlank String slug,
            @Positive @Max(value = 99, message = "Quantity is limited to 99 per product")
            int quantity) {
    }

    /** A whole basket, replacing whatever was stored before. */
    public record Basket(
            // @Valid is what makes the constraints on Line actually run.
            @Valid
            @Size(max = 100, message = "A basket can hold up to 100 different products")
            List<Line> items) {
    }
}
