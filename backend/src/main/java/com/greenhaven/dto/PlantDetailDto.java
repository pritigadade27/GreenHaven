package com.greenhaven.dto;

import java.math.BigDecimal;
import java.util.List;

/** Everything the Plant Details page renders, in one response. */
public record PlantDetailDto(
        String id,
        String slug,
        String name,
        String botanical,
        String category,
        String categoryName,
        BigDecimal price,
        BigDecimal mrp,
        String image,
        /** Extra shots, primary first. Empty for most products. */
        java.util.List<String> gallery,
        BigDecimal rating,
        Integer reviews,
        Integer stock,
        String shortDescription,
        String description,
        String tip,
        String petSafety,
        String difficulty,
        String light,
        String water,
        String maintenance,
        String growth,
        String size,
        boolean featured,
        boolean bestSeller,
        List<String> badges,
        CareDto care) {
}
