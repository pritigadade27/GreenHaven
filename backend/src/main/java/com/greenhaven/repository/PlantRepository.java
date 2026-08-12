package com.greenhaven.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.greenhaven.entity.Plant;

import jakarta.persistence.LockModeType;

public interface PlantRepository extends JpaRepository<Plant, Long> {
    Optional<Plant> findBySlug(String slug);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Plant p WHERE p.id = :id")
    Optional<Plant> findByIdForUpdate(@Param("id") Long id);

    @Query("SELECT p.category.id, COUNT(p) FROM Plant p GROUP BY p.category.id")
    List<Object[]> countByCategory();

    long countByStockLessThanEqual(int stock);

    long countByStockBetween(int low, int high);

    Page<Plant> findByStockLessThanEqualOrderByNameAscIdAsc(int stock, Pageable pageable);

    Page<Plant> findByStockBetweenOrderByStockAscIdAsc(int low, int high, Pageable pageable);

    Page<Plant> findAllByOrderByIdDesc(Pageable pageable);

    boolean existsByCode(String code);

    @Query("""
            SELECT p FROM Plant p
            WHERE (:q IS NULL
                   OR LOWER(p.name) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(p.slug) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(p.code) LIKE LOWER(CONCAT('%', :q, '%')))
            ORDER BY p.name ASC, p.id ASC
            """)
    Page<Plant> searchForAdmin(@Param("q") String q, Pageable pageable);

    List<Plant> findByFeaturedTrueAndDiscontinuedFalse();

    List<Plant> findByBestSellerTrueAndDiscontinuedFalseOrderByReviewCountDesc();

    List<Plant> findByNewArrivalTrueAndDiscontinuedFalseOrderByIdDesc();

    @Query("""
            SELECT p FROM Plant p
            WHERE p.discontinued = FALSE
              AND (:categorySlug IS NULL OR p.category.slug = :categorySlug)
              AND (:petSafety    IS NULL OR p.petSafety      = :petSafety)
              AND (:difficulty   IS NULL OR p.difficulty     = :difficulty)
              AND (:lightNeed    IS NULL OR p.lightNeed      = :lightNeed)
              AND (:waterNeed    IS NULL OR p.waterNeed      = :waterNeed)
              AND (:minPrice     IS NULL OR p.price         >= :minPrice)
              AND (:maxPrice     IS NULL OR p.price         <= :maxPrice)
              AND (:inStock      IS NULL OR :inStock = FALSE OR p.stock > 0)
              AND (:newArrival   IS NULL OR :newArrival = FALSE OR p.newArrival = TRUE)
              AND (:q IS NULL
                   OR LOWER(p.name)             LIKE LOWER(CONCAT('%', :q, '%')) ESCAPE '!'
                   OR LOWER(p.botanicalName)    LIKE LOWER(CONCAT('%', :q, '%')) ESCAPE '!'
                   OR LOWER(p.shortDescription) LIKE LOWER(CONCAT('%', :q, '%')) ESCAPE '!')
            """)
    Page<Plant> search(@Param("q") String q,
                       @Param("minPrice") java.math.BigDecimal minPrice,
                       @Param("inStock") Boolean inStock,
                       @Param("newArrival") Boolean newArrival,
                       @Param("categorySlug") String categorySlug,
                       @Param("petSafety") String petSafety,
                       @Param("difficulty") String difficulty,
                       @Param("lightNeed") String lightNeed,
                       @Param("waterNeed") String waterNeed,
                       @Param("maxPrice") java.math.BigDecimal maxPrice,
                       Pageable pageable);

    List<Plant> findByCategorySlugAndIdNot(String categorySlug, Long id);
}
