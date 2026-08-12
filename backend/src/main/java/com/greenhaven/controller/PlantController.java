package com.greenhaven.controller;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.greenhaven.dto.PageResponse;
import com.greenhaven.dto.PlantDetailDto;
import com.greenhaven.dto.PlantSummaryDto;
import com.greenhaven.service.PlantService;

/** The catalogue API. */
@RestController
@RequestMapping("/api/plants")
public class PlantController {

    private final PlantService plants;

    public PlantController(PlantService plants) {
        this.plants = plants;
    }

    @GetMapping
    public PageResponse<PlantSummaryDto> list(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String petSafety,
            @RequestParam(required = false) String difficulty,
            @RequestParam(required = false) String light,
            @RequestParam(required = false) String water,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            // Availability and recency.
            @RequestParam(required = false) Boolean inStock,
            @RequestParam(required = false) Boolean newArrival,
            @RequestParam(defaultValue = "featured") String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "24") int size) {

        // Cap the page size so a crafted request cannot ask for the whole table.
        int safeSize = Math.min(Math.max(size, 1), 100);
        return PageResponse.of(plants.search(q, category, petSafety, difficulty, light, water,
                minPrice, maxPrice, inStock, newArrival, sort, Math.max(page, 0), safeSize));
    }

    @GetMapping("/new-arrivals")
    public List<PlantSummaryDto> newArrivals(@RequestParam(defaultValue = "8") int limit) {
        return plants.newArrivals(Math.min(Math.max(limit, 1), 20));
    }

    @GetMapping("/featured")
    public List<PlantSummaryDto> featured() {
        return plants.featured();
    }

    @GetMapping("/best-sellers")
    public List<PlantSummaryDto> bestSellers(@RequestParam(defaultValue = "4") int limit) {
        return plants.bestSellers(Math.min(Math.max(limit, 1), 20));
    }

    @GetMapping("/{slug}")
    public PlantDetailDto bySlug(@PathVariable String slug) {
        return plants.bySlug(slug);
    }

    @GetMapping("/{slug}/related")
    public List<PlantSummaryDto> related(@PathVariable String slug,
                                         @RequestParam(defaultValue = "4") int limit) {
        return plants.related(slug, Math.min(Math.max(limit, 1), 12));
    }
}
