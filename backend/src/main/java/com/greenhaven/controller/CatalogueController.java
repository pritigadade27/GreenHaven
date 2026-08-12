package com.greenhaven.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.greenhaven.dto.BadgeDto;
import com.greenhaven.dto.CategoryDto;
import com.greenhaven.service.CatalogueService;

@RestController
public class CatalogueController {
    private final CatalogueService catalogue;

    public CatalogueController(CatalogueService catalogue) {
        this.catalogue = catalogue;
    }

    @GetMapping("/api/categories")
    public List<CategoryDto> categories() {
        return catalogue.allCategories();
    }

    @GetMapping("/api/badges")
    public List<BadgeDto> badges() {
        return catalogue.allBadges();
    }
}
