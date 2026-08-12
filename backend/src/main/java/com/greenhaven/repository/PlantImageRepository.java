package com.greenhaven.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.greenhaven.entity.PlantImage;

public interface PlantImageRepository extends JpaRepository<PlantImage, Long> {
    List<PlantImage> findByPlantIdOrderBySortOrderAscIdAsc(Long plantId);

    void deleteByPlantId(Long plantId);
}
