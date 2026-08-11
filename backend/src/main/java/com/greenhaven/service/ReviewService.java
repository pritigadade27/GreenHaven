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
import com.greenhaven.model.AppUser;
import com.greenhaven.model.Order;
import com.greenhaven.model.Plant;
import com.greenhaven.model.Review;
import com.greenhaven.model.ReviewImage;
import com.greenhaven.repository.AppUserRepository;
import com.greenhaven.repository.OrderRepository;
import com.greenhaven.repository.PlantRepository;
import com.greenhaven.repository.ReviewImageRepository;
import com.greenhaven.repository.ReviewRepository;

/**
 * Ratings and reviews.
 *
 * The rule that matters: only a customer who paid for a plant AND had it
 * delivered may rate it. Everything else here follows from that — the verified
 * badge, the one-review-per-plant limit, and the average being worth trusting.
 */
@Service
public class ReviewService {

    private static final int MAX_PAGE = 50;

    /**
     * Four is plenty to show a plant from every angle, and it bounds what one
     * account can put on disk.
     */
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
        plant(slug);   // 404 for an unknown product rather than an empty page

        Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), MAX_PAGE));
        Page<Review> found =
                reviews.findByPlantSlugAndStatusOrderByIdDesc(slug, Review.APPROVED, pageable);

        Long me = email == null ? null
                : users.findByEmail(email).map(AppUser::getId).orElse(null);

        // One query for the whole page's photographs rather than one per review.
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
        // Every key present, always — a bar chart should not have to guess at a
        // star nobody has given yet.
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

        // From the ratings themselves, not from the bars above. The bars round
        // half stars into whole rows to stay five rows tall, so averaging them
        // would report 4.0 for a single 3.5 — and contradict the figure on the
        // product card, which is computed the honest way.
        BigDecimal average = total == 0 ? BigDecimal.ZERO
                : BigDecimal.valueOf(reviews.averageForSlug(slug))
                        .setScale(1, RoundingMode.HALF_UP);

        return new ReviewDtos.Summary(slug, average, total, breakdown);
    }

    /**
     * May this customer write about this plant, and if not, why not.
     *
     * Answered in full rather than as a bare yes/no so the page can explain
     * itself — "only customers who have received this plant can review it"
     * beats a button that silently is not there.
     */
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

        // Checked here and not only in the UI. Hiding the button is a courtesy;
        // this is the rule.
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
        // A verified purchase goes straight up. There is nothing to screen for
        // that the delivery record has not already established, and holding
        // honest reviews in a queue nobody empties helps no one.
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
        // An edit un-hides nothing: if an admin took it down, changing the words
        // does not put it back up.
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

        // Read the file paths before the rows go, or the FK cascade takes the
        // only record of what is still sitting on disk.
        List<String> files = imagesOf(review.getId());
        reviews.delete(review);
        reviews.flush();     // the average is read back below
        files.forEach(uploads::deleteQuietly);
        recompute(plant);
    }

    /**
     * Stores one photograph for a customer who is entitled to review something.
     *
     * The delivery check is the gate. It is not about this particular product —
     * pictures are often uploaded before the review form knows which review it
     * belongs to — it is about only letting people who have actually bought
     * from us write files to the server at all.
     */
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

    /**
     * Replaces a review's photographs with exactly the list given.
     *
     * Wholesale rather than add/remove, matching the product gallery: the form
     * shows what is attached, the customer removes one and saves, and the
     * request says what should be there afterwards.
     *
     * Only paths this project stored are accepted. Without that check the body
     * of the request decides what image a public product page loads, which
     * turns every review into an off-site link of the author's choosing.
     */
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
        // Flushed before the inserts, or UNIQUE (review_id, url) fires against
        // rows the delete has not yet reached.
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

    /**
     * Rewrites the plant's rating and review count from its visible reviews.
     *
     * Called after every add, edit, delete and moderation change, so the number
     * on the shelf is never stale.
     *
     * Dropping to no reviews clears the rating rather than leaving the last
     * figure standing. Keeping it would have the product page claim "4.0 from
     * 1 review" directly above a section showing none — and once an admin has
     * hidden the only review, the whole point was that it stops counting.
     */
    @Transactional
    public void recompute(Plant plant) {
        long count = reviews.countByPlantIdAndStatus(plant.getId(), Review.APPROVED);
        plant.setRating(count == 0 ? null
                : BigDecimal.valueOf(reviews.averageFor(plant.getId()))
                        .setScale(1, RoundingMode.HALF_UP));
        plant.setReviewCount((int) count);
        plants.save(plant);
    }

    /** Used by the admin side, which holds ids rather than entities. */
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

    /**
     * First name and last initial — "Aarti D." Reviews are public, and a full
     * name beside a delivery town is more than a customer signed up to publish.
     */
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

    /**
     * Ratings go in half stars and nothing finer.
     *
     * Checked here as well as by the column, so a 3.7 gets a message a person
     * can act on rather than a constraint violation. Refused rather than
     * silently rounded: quietly turning someone's 3.7 into a 3.5 is changing
     * what they said about a product.
     */
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
