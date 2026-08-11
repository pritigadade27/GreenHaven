package com.greenhaven.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.Set;

import org.hibernate.annotations.BatchSize;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/** A product in the catalogue. */
// Class-level, so every ManyToOne that points at a Plant is batched too —
// @BatchSize is illegal on a ManyToOne property itself.
@BatchSize(size = 64)
@Entity
@Table(name = "plant")
public class Plant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Stable business key from the catalogue: p01, p02 … */
    @Column(nullable = false, unique = true, length = 12)
    private String code;

    @Column(nullable = false, unique = true, length = 120)
    private String slug;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(name = "botanical_name", length = 150)
    private String botanicalName;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @Column(precision = 10, scale = 2)
    private BigDecimal mrp;

    private Integer stock;

    @Column(length = 255)
    private String image;

    @Column(precision = 2, scale = 1)
    private BigDecimal rating;

    @Column(name = "review_count")
    private Integer reviewCount;

    @Column(name = "short_description", length = 400)
    private String shortDescription;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "care_tip", length = 400)
    private String careTip;

    @Column(name = "pet_safety", nullable = false, length = 10)
    private String petSafety;

    @Column(nullable = false, length = 10)
    private String difficulty;

    @Column(name = "light_need", nullable = false, length = 10)
    private String lightNeed;

    @Column(name = "water_need", nullable = false, length = 10)
    private String waterNeed;

    @Column(length = 40)
    private String maintenance;

    @Column(name = "growth_rate", length = 40)
    private String growthRate;

    @Column(name = "mature_size", length = 60)
    private String matureSize;

    @Column(name = "care_light", length = 400)
    private String careLight;

    @Column(name = "care_water", length = 400)
    private String careWater;

    @Column(name = "care_soil", length = 400)
    private String careSoil;

    @Column(name = "care_humidity", length = 400)
    private String careHumidity;

    @Column(name = "care_temperature", length = 400)
    private String careTemperature;

    @Column(name = "care_feed", length = 400)
    private String careFeed;

    @Column(name = "care_repot", length = 400)
    private String careRepot;

    @Column(name = "is_featured")
    private Boolean featured = Boolean.FALSE;

    @Column(name = "is_best_seller")
    private Boolean bestSeller = Boolean.FALSE;

    /**
     * Retired from the shop but kept for its history. Set instead of deleting
     * whenever a product has been ordered.
     */
    @Column(nullable = false)
    private boolean discontinued = false;

    @Column(name = "is_new_arrival", nullable = false)
    private Boolean newArrival = Boolean.FALSE;

    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;

    /**
     * Batched, not join-fetched. A fetch join on a collection forces Hibernate
     * to apply the page limit in memory — it would read every plant to return
     * twenty. Batching keeps LIMIT in SQL and collapses the per-row badge
     * lookups from one query each into one per batch: listing 100 products
     * went from 138 SELECTs to a handful.
     */
    @BatchSize(size = 64)
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
            name = "plant_badge",
            joinColumns = @JoinColumn(name = "plant_id"),
            inverseJoinColumns = @JoinColumn(name = "badge_id"))
    private Set<Badge> badges = new LinkedHashSet<>();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getBotanicalName() { return botanicalName; }
    public void setBotanicalName(String botanicalName) { this.botanicalName = botanicalName; }

    public Category getCategory() { return category; }
    public void setCategory(Category category) { this.category = category; }

    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }

    public BigDecimal getMrp() { return mrp; }
    public void setMrp(BigDecimal mrp) { this.mrp = mrp; }

    public Integer getStock() { return stock; }
    public void setStock(Integer stock) { this.stock = stock; }

    public String getImage() { return image; }
    public void setImage(String image) { this.image = image; }

    public BigDecimal getRating() { return rating; }
    public void setRating(BigDecimal rating) { this.rating = rating; }

    public Integer getReviewCount() { return reviewCount; }
    public void setReviewCount(Integer reviewCount) { this.reviewCount = reviewCount; }

    public String getShortDescription() { return shortDescription; }
    public void setShortDescription(String shortDescription) { this.shortDescription = shortDescription; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getCareTip() { return careTip; }
    public void setCareTip(String careTip) { this.careTip = careTip; }

    public String getPetSafety() { return petSafety; }
    public void setPetSafety(String petSafety) { this.petSafety = petSafety; }

    public String getDifficulty() { return difficulty; }
    public void setDifficulty(String difficulty) { this.difficulty = difficulty; }

    public String getLightNeed() { return lightNeed; }
    public void setLightNeed(String lightNeed) { this.lightNeed = lightNeed; }

    public String getWaterNeed() { return waterNeed; }
    public void setWaterNeed(String waterNeed) { this.waterNeed = waterNeed; }

    public String getMaintenance() { return maintenance; }
    public void setMaintenance(String maintenance) { this.maintenance = maintenance; }

    public String getGrowthRate() { return growthRate; }
    public void setGrowthRate(String growthRate) { this.growthRate = growthRate; }

    public String getMatureSize() { return matureSize; }
    public void setMatureSize(String matureSize) { this.matureSize = matureSize; }

    public String getCareLight() { return careLight; }
    public void setCareLight(String careLight) { this.careLight = careLight; }

    public String getCareWater() { return careWater; }
    public void setCareWater(String careWater) { this.careWater = careWater; }

    public String getCareSoil() { return careSoil; }
    public void setCareSoil(String careSoil) { this.careSoil = careSoil; }

    public String getCareHumidity() { return careHumidity; }
    public void setCareHumidity(String careHumidity) { this.careHumidity = careHumidity; }

    public String getCareTemperature() { return careTemperature; }
    public void setCareTemperature(String careTemperature) { this.careTemperature = careTemperature; }

    public String getCareFeed() { return careFeed; }
    public void setCareFeed(String careFeed) { this.careFeed = careFeed; }

    public String getCareRepot() { return careRepot; }
    public void setCareRepot(String careRepot) { this.careRepot = careRepot; }

    public boolean isDiscontinued() { return discontinued; }
    public void setDiscontinued(boolean discontinued) { this.discontinued = discontinued; }

    public Boolean getNewArrival() { return newArrival; }
    public void setNewArrival(Boolean newArrival) { this.newArrival = newArrival; }

    public Boolean getFeatured() { return featured; }
    public void setFeatured(Boolean featured) { this.featured = featured; }

    public Boolean getBestSeller() { return bestSeller; }
    public void setBestSeller(Boolean bestSeller) { this.bestSeller = bestSeller; }

    public Instant getCreatedAt() { return createdAt; }

    public Set<Badge> getBadges() { return badges; }
    public void setBadges(Set<Badge> badges) { this.badges = badges; }
}
