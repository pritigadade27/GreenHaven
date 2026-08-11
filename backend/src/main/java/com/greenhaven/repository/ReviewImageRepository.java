package com.greenhaven.repository;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.greenhaven.model.ReviewImage;

public interface ReviewImageRepository extends JpaRepository<ReviewImage, Long> {

    List<ReviewImage> findByReviewIdOrderBySortOrderAscIdAsc(Long reviewId);

    /**
     * Every image for a page of reviews in one query. Fetching per review turns
     * a ten-review page into eleven round trips for no reason.
     */
    List<ReviewImage> findByReviewIdInOrderBySortOrderAscIdAsc(Collection<Long> reviewIds);

    void deleteByReviewId(Long reviewId);
}
