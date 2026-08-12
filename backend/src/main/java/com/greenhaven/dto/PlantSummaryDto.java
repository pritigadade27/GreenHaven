package com.greenhaven.dto;

import java.math.BigDecimal;
import java.util.List;

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
        boolean newArrival,
        String careTip,
        List<String> badges,
        boolean merchandise) {
}
