package com.greenhaven.service;

import java.util.List;

import org.springframework.stereotype.Component;

import com.greenhaven.dto.CareDto;
import com.greenhaven.dto.PlantDetailDto;
import com.greenhaven.dto.PlantSummaryDto;
import com.greenhaven.model.Badge;
import com.greenhaven.model.Plant;

/**
 * Entity -> DTO translation lives here so controllers stay thin and JPA
 * entities never leak out of the service layer.
 *
 * Field names deliberately match the React catalogue (`short`, `tip`, `light`)
 * so the frontend can swap plants.js for the API with minimal churn.
 */
@Component
public class PlantMapper {

    public PlantSummaryDto toSummary(Plant p) {
        return new PlantSummaryDto(
                p.getCode(), p.getSlug(), p.getName(), p.getBotanicalName(),
                p.getCategory().getSlug(), p.getCategory().getName(),
                p.getPrice(), p.getMrp(), p.getImage(),
                p.getRating(), p.getReviewCount(), p.getStock(),
                p.getShortDescription(), p.getPetSafety(), p.getDifficulty(),
                p.getLightNeed(), p.getWaterNeed(),
                Boolean.TRUE.equals(p.getFeatured()), Boolean.TRUE.equals(p.getBestSeller()),
                p.getCareTip(), badgeCodes(p), isMerchandise(p));
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
