package com.greenhaven.dto;

import java.math.BigDecimal;
import java.util.List;

/** What a product card needs — deliberately smaller than the detail payload. */
public record PlantSummaryDto(
        String id,
        String slug,
        String name,
        String botanical,
        String category,
        String categoryName,
        BigDecimal price,
        BigDecimal mrp,
        String image,
        BigDecimal rating,
        Integer reviews,
        Integer stock,
        String shortDescription,
        String petSafety,
        String difficulty,
        String light,
        String water,
        boolean featured,
        boolean bestSeller,
        String careTip,
        List<String> badges,
        /** True for pots, tools, care products and seed packets. */
        boolean merchandise) {
}
