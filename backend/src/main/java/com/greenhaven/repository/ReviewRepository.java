package com.greenhaven.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.greenhaven.entity.Review;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    Page<Review> findAllByOrderByIdDesc(Pageable pageable);

    Page<Review> findByStatusOrderByIdDesc(String status, Pageable pageable);

    long countByStatus(String status);

    /** One plant's visible reviews, newest first. */
    Page<Review> findByPlantSlugAndStatusOrderByIdDesc(String slug, String status,
                                                       Pageable pageable);

    /** The customer's own review of a plant, whatever its status — they must be able to see and edit a. */
    Optional<Review> findByUserIdAndPlantId(Long userId, Long plantId);

    Optional<Review> findByUserIdAndPlantSlug(Long userId, String slug);

    Optional<Review> findByIdAndUserId(Long id, Long userId);

    List<Review> findByUserIdOrderByIdDesc(Long userId);

    /** The average and count that go on the plant row. */
    @Query("SELECT COALESCE(AVG(r.rating), 0) FROM Review r "
            + "WHERE r.plant.id = :plantId AND r.status = 'APPROVED'")
    double averageFor(@Param("plantId") Long plantId);

    /** The same average, by slug, for the product page's summary. */
    @Query("SELECT COALESCE(AVG(r.rating), 0) FROM Review r "
            + "WHERE r.plant.slug = :slug AND r.status = 'APPROVED'")
    double averageForSlug(@Param("slug") String slug);

    long countByPlantIdAndStatus(Long plantId, String status);

    /** How many of each star, for the 5★–1★ breakdown. */
    @Query("SELECT FLOOR(r.rating + 0.5), COUNT(r) FROM Review r "
            + "WHERE r.plant.slug = :slug AND r.status = 'APPROVED' "
            + "GROUP BY FLOOR(r.rating + 0.5)")
    List<Object[]> breakdownFor(@Param("slug") String slug);

    long countByPlantSlugAndStatus(String slug, String status);
}
