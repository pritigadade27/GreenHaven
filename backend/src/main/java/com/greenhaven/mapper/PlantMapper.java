package com.greenhaven.mapper;

import java.util.List;

import org.springframework.stereotype.Component;

import com.greenhaven.dto.CareDto;
import com.greenhaven.dto.PlantDetailDto;
import com.greenhaven.dto.PlantSummaryDto;
import com.greenhaven.entity.Badge;
import com.greenhaven.entity.Plant;

/** Entity -> DTO translation lives here so controllers stay thin and JPA entities never leak out. */
@Component
public class PlantMapper {

    private final com.greenhaven.repository.PlantImageRepository images;

    public PlantMapper(com.greenhaven.repository.PlantImageRepository images) {
        this.images = images;
    }

    public PlantSummaryDto toSummary(Plant p) {
        return new PlantSummaryDto(
                p.getCode(), p.getSlug(), p.getName(), p.getBotanicalName(),
                p.getCategory().getSlug(), p.getCategory().getName(),
                p.getPrice(), p.getMrp(), p.getImage(),
                p.getRating(), p.getReviewCount(), p.getStock(),
                p.getShortDescription(), p.getPetSafety(), p.getDifficulty(),
                p.getLightNeed(), p.getWaterNeed(),
                Boolean.TRUE.equals(p.getFeatured()), Boolean.TRUE.equals(p.getBestSeller()),
                Boolean.TRUE.equals(p.getNewArrival()),
                p.getCareTip(), badgeCodes(p), isMerchandise(p));
    }

    /** The primary shot followed by any extras, in the admin's chosen order. */
    private java.util.List<String> galleryFor(Plant p) {
        java.util.List<String> extras = images.findByPlantIdOrderBySortOrderAscIdAsc(p.getId())
                .stream().map(com.greenhaven.entity.PlantImage::getUrl).toList();
        if (extras.isEmpty()) return java.util.List.of(p.getImage());
        return java.util.stream.Stream.concat(java.util.stream.Stream.of(p.getImage()), extras.stream())
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();
    }

    /** Living plant, or something else? */
    private boolean isMerchandise(Plant p) {
        String code = p.getCode();
        if (code == null || code.isEmpty()) return false;
        char kind = Character.toLowerCase(code.charAt(0));
        return kind == 'm' || kind == 's';
    }

    public PlantDetailDto toDetail(Plant p) {
        return new PlantDetailDto(
                p.getCode(), p.getSlug(), p.getName(), p.getBotanicalName(),
                p.getCategory().getSlug(), p.getCategory().getName(),
                p.getPrice(), p.getMrp(), p.getImage(),
                galleryFor(p),
                p.getRating(), p.getReviewCount(), p.getStock(),
                p.getShortDescription(), p.getDescription(), p.getCareTip(),
                p.getPetSafety(), p.getDifficulty(), p.getLightNeed(), p.getWaterNeed(),
                p.getMaintenance(), p.getGrowthRate(), p.getMatureSize(),
                Boolean.TRUE.equals(p.getFeatured()), Boolean.TRUE.equals(p.getBestSeller()),
                badgeCodes(p),
                new CareDto(p.getCareLight(), p.getCareWater(), p.getCareSoil(),
                        p.getCareHumidity(), p.getCareTemperature(), p.getCareFeed(),
                        p.getCareRepot()));
    }

    private List<String> badgeCodes(Plant p) {
        return p.getBadges().stream().map(Badge::getCode).sorted().toList();
    }
}
