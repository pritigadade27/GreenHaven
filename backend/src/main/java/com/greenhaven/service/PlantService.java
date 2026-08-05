package com.greenhaven.service;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.greenhaven.dto.PlantDetailDto;
import com.greenhaven.dto.PlantSummaryDto;
import com.greenhaven.exception.ResourceNotFoundException;
import com.greenhaven.model.Plant;
import com.greenhaven.repository.PlantRepository;

@Service
@Transactional(readOnly = true)
public class PlantService {

    private final PlantRepository plants;
    private final PlantMapper mapper;

    public PlantService(PlantRepository plants, PlantMapper mapper) {
        this.plants = plants;
        this.mapper = mapper;
    }

    /** Maps the client's sort key onto a real Sort, defaulting safely. */
    private Sort sortFor(String key) {
        return switch (key == null ? "featured" : key) {
            case "price-asc"  -> Sort.by(Sort.Direction.ASC, "price");
            case "price-desc" -> Sort.by(Sort.Direction.DESC, "price");
            case "rating"     -> Sort.by(Sort.Direction.DESC, "rating");
            case "popular"    -> Sort.by(Sort.Direction.DESC, "reviewCount");
            case "name"       -> Sort.by(Sort.Direction.ASC, "name");
            default           -> Sort.by(Sort.Direction.DESC, "featured")
                                     .and(Sort.by(Sort.Direction.DESC, "reviewCount"));
        };
    }

    /** Neutralises LIKE wildcards in a customer's search term. */
    private static String escapeLike(String q) {
        if (q == null) return null;
        return q.replace("!", "!!").replace("%", "!%").replace("_", "!_");
    }

    public Page<PlantSummaryDto> search(String q, String category, String petSafety,
                                        String difficulty, String light, String water,
                                        BigDecimal maxPrice, String sort, int page, int size) {
        // Blank strings arrive from empty query params; the query treats only
        // null as "no filter", so normalise here rather than in every clause.
        return plants.search(escapeLike(blankToNull(q)), blankToNull(category), blankToNull(petSafety),
                        blankToNull(difficulty), blankToNull(light), blankToNull(water), maxPrice,
                        PageRequest.of(page, size, sortFor(sort)))
                .map(mapper::toSummary);
    }

    public PlantDetailDto bySlug(String slug) {
        return plants.findBySlug(slug).map(mapper::toDetail)
                .orElseThrow(() -> new ResourceNotFoundException("No plant with slug '" + slug + "'"));
    }

    public List<PlantSummaryDto> featured() {
        return plants.findByFeaturedTrue().stream().map(mapper::toSummary).toList();
    }

    public List<PlantSummaryDto> bestSellers(int limit) {
        return plants.findByBestSellerTrueOrderByReviewCountDesc().stream()
                .limit(limit).map(mapper::toSummary).toList();
    }

    /**
     * Same category first, then anything sharing a badge — mirrors getRelated()
     * in the React data layer so both sides recommend the same plants.
     */
    public List<PlantSummaryDto> related(String slug, int limit) {
        Plant plant = plants.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("No plant with slug '" + slug + "'"));

        List<Plant> sameCategory =
                plants.findByCategorySlugAndIdNot(plant.getCategory().getSlug(), plant.getId());

        if (sameCategory.size() >= limit) {
            return sameCategory.stream().limit(limit).map(mapper::toSummary).toList();
        }

        List<Plant> filler = plants.findAll().stream()
                .filter(p -> !p.getId().equals(plant.getId()))
                .filter(p -> !sameCategory.contains(p))
                .filter(p -> p.getBadges().stream().anyMatch(plant.getBadges()::contains))
                .sorted(Comparator.comparing(Plant::getReviewCount, Comparator.reverseOrder()))
                .toList();

        return java.util.stream.Stream.concat(sameCategory.stream(), filler.stream())
                .limit(limit).map(mapper::toSummary).toList();
    }

    private static String blankToNull(String value) {
        return (value == null || value.isBlank()) ? null : value.trim();
    }
}
