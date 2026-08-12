package com.greenhaven.dto;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public final class BasketDto {
    private BasketDto() { }

    public record Line(
            @NotBlank String slug,
            @Positive @Max(value = 99, message = "Quantity is limited to 99 per product")
            int quantity) {
    }

    public record Basket(
            @Valid
            @Size(max = 100, message = "A basket can hold up to 100 different products")
            List<Line> items) {
    }
}
