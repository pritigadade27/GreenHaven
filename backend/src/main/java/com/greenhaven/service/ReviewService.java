package com.greenhaven.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.greenhaven.dto.ReviewDtos;
import com.greenhaven.exception.ResourceNotFoundException;
import com.greenhaven.entity.AppUser;
import com.greenhaven.entity.Order;
import com.greenhaven.entity.Plant;
import com.greenhaven.entity.Review;
import com.greenhaven.entity.ReviewImage;
import com.greenhaven.repository.AppUserRepository;
import com.greenhaven.repository.OrderRepository;
import com.greenhaven.repository.PlantRepository;
import com.greenhaven.repository.ReviewImageRepository;
import com.greenhaven.repository.ReviewRepository;

@Service
public class ReviewService {
    private static final int MAX_PAGE = 50;

    private static final int MAX_IMAGES = 4;

    private final ReviewRepository reviews;
    private final PlantRepository plants;
    private final OrderRepository orders;
    private final AppUserRepository users;
    private final ReviewImageRepository images;
    private final UploadService uploads;

    public ReviewService(ReviewRepository reviews, PlantRepository plants,
                         OrderRepository orders, AppUserRepository users,
                         ReviewImageRepository images, UploadService uploads) {
        this.reviews = reviews;
        this.plants = plants;
        this.orders = orders;
        this.users = users;
        this.images = images;
        this.uploads = uploads;
    }

    @Transactional(readOnly = true)
    public ReviewDtos.ReviewPage page(String slug, int page, int size, String email) {
        plant(slug);

        Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), MAX_PAGE));
        Page<Review> found =
                reviews.findByPlantSlugAndStatusOrderByIdDesc(slug, Review.APPROVED, pageable);

        Long me = email == null ? null
                : users.findByEmail(email).map(AppUser::getId).orElse(null);

        Map<Long, List<String>> photos = imagesFor(
                found.getContent().stream().map(Review::getId).toList());

        return new ReviewDtos.ReviewPage(
                summary(slug),
                found.getContent().stream()
                        .map(r -> toDto(r, me, photos.getOrDefault(r.getId(), List.of())))
                        .toList(),
                found.getNumber(), found.getSize(), found.getTotalPages(), found.hasNext());
    }

    @Transactional(readOnly = true)
    public ReviewDtos.Summary summary(String slug) {
        Map<Integer, Long> breakdown = new LinkedHashMap<>();
        for (int star = 5; star >= 1; star--) {
            breakdown.put(star, 0L);
        }

        long total = 0;
        for (Object[] row : reviews.breakdownFor(slug)) {
            int star = ((Number) row[0]).intValue();
            long count = ((Number) row[1]).longValue();
            breakdown.put(star, count);
            total += count;
        }

        BigDecimal average = total == 0 ? BigDecimal.ZERO
                : BigDecimal.valueOf(reviews.averageForSlug(slug))
                        .setScale(1, RoundingMode.HALF_UP);

        return new ReviewDtos.Summary(slug, average, total, breakdown);
    }

    @Transactional(readOnly = true)
    public ReviewDtos.Eligibility eligibility(String email, String slug) {
        Plant plant = plant(slug);
        AppUser user = user(email);

        Optional<Review> existing = reviews.findByUserIdAndPlantId(user.getId(), plant.getId());
        if (existing.isPresent()) {
            Review r = existing.get();
            return new ReviewDtos.Eligibility(false,
                    "You have already reviewed this plant. You can edit or delete your review.",
                    r.getOrder() == null ? null : r.getOrder().getOrderNumber(),
                    true, toDto(r, user.getId()));
        }

        List<Order> delivered = orders.deliveredContaining(user.getId(), slug);
        if (delivered.isEmpty()) {
            return new ReviewDtos.Eligibility(false,
                    "Only customers who have received this plant can review it.",
                    null, false, null);
        }
        return new ReviewDtos.Eligibility(true, null,
                delivered.get(0).getOrderNumber(), false, null);
    }

    @Transactional(readOnly = true)
    public List<ReviewDtos.ReviewDto> mine(String email) {
        AppUser user = user(email);
        List<Review> found = reviews.findByUserIdOrderByIdDesc(user.getId());
        Map<Long, List<String>> photos = imagesFor(found.stream().map(Review::getId).toList());
        return found.stream()
                .map(r -> toDto(r, user.getId(), photos.getOrDefault(r.getId(), List.of())))
                .toList();
    }

    @Transactional
    public ReviewDtos.ReviewDto write(String email, String slug, ReviewDtos.WriteRequest request) {
        Plant plant = plant(slug);
        AppUser user = user(email);

        if (reviews.findByUserIdAndPlantId(user.getId(), plant.getId()).isPresent()) {
            throw new IllegalArgumentException(
                    "You have already reviewed this plant. Edit your review instead.");
        }

        List<Order> delivered = orders.deliveredContaining(user.getId(), slug);
        if (delivered.isEmpty()) {
            throw new IllegalArgumentException(
                    "Only customers who have received this plant can review it.");
        }

        Review review = new Review();
        review.setPlant(plant);
        review.setUser(user);
        review.setOrder(delivered.get(0));
        review.setVerifiedPurchase(true);
        apply(review, request);
        review.setStatus(Review.APPROVED);

        Review saved = reviews.save(review);
        List<String> photos = syncImages(saved, request.images());
        recompute(plant);
        return toDto(saved, user.getId(), photos);
    }

    @Transactional
    public ReviewDtos.ReviewDto edit(String email, Long id, ReviewDtos.WriteRequest request) {
        AppUser user = user(email);
        Review review = owned(user, id);

        apply(review, request);
        review.setUpdatedAt(Instant.now());
        Review saved = reviews.save(review);
        List<String> photos = syncImages(saved, request.images());
        recompute(saved.getPlant());
        return toDto(saved, user.getId(), photos);
    }

    @Transactional
    public void delete(String email, Long id) {
        AppUser user = user(email);
        Review review = owned(user, id);
        Plant plant = review.getPlant();

        List<String> files = imagesOf(review.getId());
        reviews.delete(review);
        reviews.flush();
        files.forEach(uploads::deleteQuietly);
        recompute(plant);
    }

    @Transactional(readOnly = true)
    public ReviewDtos.UploadedImage uploadImage(String email,
                                                org.springframework.web.multipart.MultipartFile file) {
        AppUser user = user(email);
        if (!orders.hasDelivered(user.getId())) {
            throw new IllegalArgumentException(
                    "Photographs can be added once an order has been delivered.");
        }
        return new ReviewDtos.UploadedImage(uploads.storeReviewImage(file));
    }

    private List<String> syncImages(Review review, List<String> urls) {
        List<String> wanted = urls == null ? List.of()
                : urls.stream()
                        .filter(u -> u != null && !u.isBlank())
                        .map(String::trim)
                        .distinct()
                        .toList();

        if (wanted.size() > MAX_IMAGES) {
            throw new IllegalArgumentException(
                    "You can attach up to " + MAX_IMAGES + " photographs.");
        }
        for (String url : wanted) {
            if (!uploads.isStoredReviewImage(url)) {
                throw new IllegalArgumentException("Attach photographs using the upload button.");
            }
        }

        List<String> previous = imagesOf(review.getId());
        images.deleteByReviewId(review.getId());
        images.flush();

        int order = 0;
        for (String url : wanted) {
            ReviewImage row = new ReviewImage();
            row.setReview(review);
            row.setUrl(url);
            row.setSortOrder(order++);
            images.save(row);
        }

        previous.stream().filter(url -> !wanted.contains(url)).forEach(uploads::deleteQuietly);
        return wanted;
    }

    private List<String> imagesOf(Long reviewId) {
        return images.findByReviewIdOrderBySortOrderAscIdAsc(reviewId).stream()
                .map(ReviewImage::getUrl)
                .toList();
    }

    private Map<Long, List<String>> imagesFor(List<Long> reviewIds) {
        if (reviewIds.isEmpty()) return Map.of();
        Map<Long, List<String>> byReview = new LinkedHashMap<>();
        for (ReviewImage image : images.findByReviewIdInOrderBySortOrderAscIdAsc(reviewIds)) {
            byReview.computeIfAbsent(image.getReview().getId(), k -> new java.util.ArrayList<>())
                    .add(image.getUrl());
        }
        return byReview;
    }

    @Transactional
    public void recompute(Plant plant) {
        long count = reviews.countByPlantIdAndStatus(plant.getId(), Review.APPROVED);
        plant.setRating(count == 0 ? null
                : BigDecimal.valueOf(reviews.averageFor(plant.getId()))
                        .setScale(1, RoundingMode.HALF_UP));
        plant.setReviewCount((int) count);
        plants.save(plant);
    }

    @Transactional
    public void recompute(Long plantId) {
        plants.findById(plantId).ifPresent(this::recompute);
    }

    private static void apply(Review review, ReviewDtos.WriteRequest r) {
        review.setRating(halfStar(r.rating()));
        review.setTitle(blankToNull(r.title()));
        review.setBody(r.body().trim());
    }

    private ReviewDtos.ReviewDto toDto(Review r, Long me) {
        return toDto(r, me, imagesOf(r.getId()));
    }

    private ReviewDtos.ReviewDto toDto(Review r, Long me, List<String> photos) {
        return new ReviewDtos.ReviewDto(
                r.getId(), displayName(r.getUser()), r.getRating(), r.getTitle(), r.getBody(),
                r.isVerifiedPurchase(), r.getCreatedAt(), r.getUpdatedAt(),
                me != null && me.equals(r.getUser().getId()), photos);
    }

    private static String displayName(AppUser user) {
        String full = user.getFullName() == null ? "" : user.getFullName().trim();
        if (full.isEmpty()) return "A customer";

        String[] parts = full.split("\\s+");
        if (parts.length == 1) return parts[0];
        return parts[0] + " " + parts[parts.length - 1].charAt(0) + ".";
    }

    private Review owned(AppUser user, Long id) {
        return reviews.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("No review of yours with that id."));
    }

    private Plant plant(String slug) {
        return plants.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("No product with slug '" + slug + "'"));
    }

    private AppUser user(String email) {
        return users.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Not signed in."));
    }

    private static java.math.BigDecimal halfStar(java.math.BigDecimal rating) {
        java.math.BigDecimal scaled = rating.setScale(1, java.math.RoundingMode.UNNECESSARY);
        if (scaled.movePointRight(1).remainder(java.math.BigDecimal.valueOf(5))
                .compareTo(java.math.BigDecimal.ZERO) != 0) {
            throw new IllegalArgumentException("Ratings go in half stars — 3.5, not 3.7.");
        }
        return scaled;
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
