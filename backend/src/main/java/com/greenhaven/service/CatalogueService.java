package com.greenhaven.service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.greenhaven.dto.BadgeDto;
import com.greenhaven.dto.CategoryDto;
import com.greenhaven.repository.BadgeRepository;
import com.greenhaven.repository.CategoryRepository;
import com.greenhaven.repository.PlantRepository;

@Service
@Transactional(readOnly = true)
public class CatalogueService {

    private final CategoryRepository categories;
    private final BadgeRepository badges;
    private final PlantRepository plants;

    public CatalogueService(CategoryRepository categories, BadgeRepository badges,
                            PlantRepository plants) {
        this.categories = categories;
        this.badges = badges;
        this.plants = plants;
    }

    public List<CategoryDto> allCategories() {
        // One GROUP BY, not the whole plant table.
        Map<Long, Long> counts = plants.countByCategory().stream()
                .collect(Collectors.toMap(row -> (Long) row[0], row -> (Long) row[1]));

        return categories.findAllByOrderBySortOrderAsc().stream()
                .map(c -> new CategoryDto(c.getSlug(), c.getName(), c.getBlurb(),
                        counts.getOrDefault(c.getId(), 0L)))
                .toList();
    }

    public List<BadgeDto> allBadges() {
        return badges.findAll().stream()
                .map(b -> new BadgeDto(b.getCode(), b.getLabel(), b.getTone(), b.getIcon(), b.getDetail()))
                .toList();
    }
}
