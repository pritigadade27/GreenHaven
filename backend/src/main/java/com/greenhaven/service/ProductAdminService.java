package com.greenhaven.service;

import java.math.BigDecimal;
import java.util.Locale;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.greenhaven.dto.ProductAdminDtos;
import com.greenhaven.exception.ResourceNotFoundException;
import com.greenhaven.entity.Category;
import com.greenhaven.entity.Plant;
import com.greenhaven.repository.CategoryRepository;
import com.greenhaven.repository.OrderItemRepository;
import com.greenhaven.repository.PlantRepository;

@Service
public class ProductAdminService {
    private static final Set<String> PET_SAFETY = Set.of("safe", "caution", "toxic");
    private static final Set<String> DIFFICULTY = Set.of("easy", "medium", "hard");
    private static final Set<String> LIGHT = Set.of("low", "medium", "bright", "direct");
    private static final Set<String> WATER = Set.of("low", "medium", "high");

    private final PlantRepository plants;
    private final CategoryRepository categories;
    private final OrderItemRepository orderItems;
    private final UploadService uploads;
    private final com.greenhaven.repository.PlantImageRepository images;

    public ProductAdminService(PlantRepository plants, CategoryRepository categories,
                               OrderItemRepository orderItems, UploadService uploads,
                               com.greenhaven.repository.PlantImageRepository images) {
        this.plants = plants;
        this.categories = categories;
        this.orderItems = orderItems;
        this.uploads = uploads;
        this.images = images;
    }

    @Transactional
    public ProductAdminDtos.ProductRow create(ProductAdminDtos.ProductRequest r) {
        String slug = slugify(r.slug() == null || r.slug().isBlank() ? r.name() : r.slug());
        // Reject duplicate slug
        if (plants.findBySlug(slug).isPresent()) {
            throw new IllegalArgumentException("A product with the slug '" + slug + "' already exists.");
        }

        Plant plant = new Plant();
        plant.setSlug(slug);
        plant.setCode(nextCode());
        apply(plant, r);
        return toRow(plants.save(plant));
    }

    @Transactional
    public ProductAdminDtos.ProductRow update(Long id, ProductAdminDtos.ProductRequest r) {
        Plant plant = plants.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("No product with id " + id));

        if (r.slug() != null && !r.slug().isBlank()) {
            String slug = slugify(r.slug());
            if (!slug.equals(plant.getSlug()) && plants.findBySlug(slug).isPresent()) {
                throw new IllegalArgumentException("Another product already uses the slug '" + slug + "'.");
            }
            plant.setSlug(slug);
        }

        String previousImage = plant.getImage();
        apply(plant, r);
        Plant saved = plants.save(plant);

        // Remove replaced image
        if (previousImage != null && !previousImage.equals(saved.getImage())) {
            uploads.deleteQuietly(previousImage);
        }
        return toRow(saved);
    }

    @Transactional
    public ProductAdminDtos.DeleteOutcome delete(Long id) {
        Plant plant = plants.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("No product with id " + id));

        // Discontinue if already ordered
        long sold = orderItems.countByPlantId(id);
        if (sold > 0) {
            plant.setDiscontinued(true);
            plants.save(plant);
            return new ProductAdminDtos.DeleteOutcome(false, true,
                    "This product appears on " + sold + " order line"
                            + (sold == 1 ? "" : "s") + ", so it has been discontinued rather than "
                            + "deleted. It is off the shop and its order history is intact.");
        }

        String image = plant.getImage();
        plants.delete(plant);
        uploads.deleteQuietly(image);
        return new ProductAdminDtos.DeleteOutcome(true, false,
                "Deleted. It had never been ordered, so nothing else referred to it.");
    }

    @Transactional
    public ProductAdminDtos.ProductRow setDiscontinued(Long id, boolean discontinued) {
        Plant plant = plants.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("No product with id " + id));
        plant.setDiscontinued(discontinued);
        return toRow(plants.save(plant));
    }

    @Transactional
    public java.util.List<String> setGallery(Long id, java.util.List<String> urls) {
        Plant plant = plants.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("No product with id " + id));

        java.util.List<String> wanted = urls == null ? java.util.List.of()
                : urls.stream().filter(u -> u != null && !u.isBlank()).map(String::trim).distinct().toList();
        if (wanted.size() > 8) {
            throw new IllegalArgumentException("A product can carry up to 8 extra photographs.");
        }

        java.util.List<String> previous = images.findByPlantIdOrderBySortOrderAscIdAsc(id)
                .stream().map(com.greenhaven.entity.PlantImage::getUrl).toList();

        // Replace gallery rows
        images.deleteByPlantId(id);
        images.flush();

        int order = 0;
        for (String url : wanted) {
            com.greenhaven.entity.PlantImage row = new com.greenhaven.entity.PlantImage();
            row.setPlant(plant);
            row.setUrl(url);
            row.setSortOrder(order++);
            images.save(row);
        }

        previous.stream()
                .filter(url -> !wanted.contains(url) && !url.equals(plant.getImage()))
                .forEach(uploads::deleteQuietly);
        return wanted;
    }

    private void apply(Plant p, ProductAdminDtos.ProductRequest r) {
        p.setName(r.name().trim());
        p.setBotanicalName(blank(r.botanicalName()));
        p.setCategory(category(r.categorySlug()));
        p.setPrice(r.price());
        p.setMrp(r.mrp() == null ? r.price() : r.mrp());
        p.setStock(r.stock() == null ? 0 : Math.max(0, r.stock()));
        if (r.image() != null && !r.image().isBlank()) p.setImage(r.image().trim());
        p.setShortDescription(blank(r.shortDescription()));
        p.setDescription(blank(r.description()));
        p.setCareTip(blank(r.careTip()));
        p.setPetSafety(oneOf(r.petSafety(), PET_SAFETY, "pet safety"));
        p.setDifficulty(oneOf(r.difficulty(), DIFFICULTY, "difficulty"));
        p.setLightNeed(oneOf(r.light(), LIGHT, "light need"));
        p.setWaterNeed(oneOf(r.water(), WATER, "water need"));
        p.setFeatured(Boolean.TRUE.equals(r.featured()));
        p.setBestSeller(Boolean.TRUE.equals(r.bestSeller()));
        p.setNewArrival(Boolean.TRUE.equals(r.newArrival()));
        if (r.discontinued() != null) p.setDiscontinued(r.discontinued());

        if (p.getMrp() != null && p.getMrp().compareTo(p.getPrice()) < 0) {
            throw new IllegalArgumentException("The MRP cannot be lower than the price.");
        }
    }

    private Category category(String slug) {
        return categories.findBySlug(slug)
                .orElseThrow(() -> new IllegalArgumentException("No category '" + slug + "'."));
    }

    private static String oneOf(String value, Set<String> allowed, String label) {
        String v = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        if (!allowed.contains(v)) {
            throw new IllegalArgumentException(
                    "Choose a " + label + " from: " + String.join(", ", allowed) + ".");
        }
        return v;
    }

    static String slugify(String raw) {
        String s = java.text.Normalizer.normalize(raw == null ? "" : raw, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
        if (s.isBlank()) throw new IllegalArgumentException("That name cannot be made into a web address.");
        return s.length() > 120 ? s.substring(0, 120) : s;
    }

    private String nextCode() {
        long n = plants.count() + 1;
        String code;
        do {
            code = String.format("GH-%04d", n++);
        } while (plants.existsByCode(code));
        return code;
    }

    private static String blank(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    static ProductAdminDtos.ProductRow toRow(Plant p) {
        return new ProductAdminDtos.ProductRow(
                p.getId(), p.getCode(), p.getSlug(), p.getName(), p.getBotanicalName(),
                p.getCategory().getSlug(), p.getCategory().getName(), p.getPrice(), p.getMrp(),
                p.getStock(), p.getImage(), p.getShortDescription(), p.getDescription(),
                p.getCareTip(), p.getPetSafety(), p.getDifficulty(), p.getLightNeed(),
                p.getWaterNeed(), Boolean.TRUE.equals(p.getFeatured()),
                Boolean.TRUE.equals(p.getBestSeller()), Boolean.TRUE.equals(p.getNewArrival()),
                p.isDiscontinued(), p.getRating(), p.getReviewCount());
    }
}
