package com.greenhaven.controller;

import java.security.Principal;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.greenhaven.dto.ApiMessage;
import com.greenhaven.dto.ReviewDtos;
import com.greenhaven.service.ReviewService;

import jakarta.validation.Valid;

/**
 * Product ratings and reviews.
 *
 *   GET    /api/plants/{slug}/reviews     summary + a page of reviews (public)
 *   GET    /api/reviews/{slug}/eligibility  may I write? (signed in)
 *   POST   /api/reviews/{slug}            write one (signed in, delivered only)
 *   PUT    /api/reviews/{id}              edit my own
 *   DELETE /api/reviews/{id}              delete my own
 *   GET    /api/reviews/mine              everything I have written
 *
 * The public read sits under /api/plants deliberately, not /api/reviews: that
 * prefix is already open to anonymous GETs, so reading needs no new security
 * rule, and everything under /api/reviews stays authenticated without a
 * per-path exception that a later route could accidentally slip through.
 * Reviews are what a shopper comes to read — requiring an account to see them
 * would be absurd. Writing is another matter.
 */
@RestController
public class ReviewController {

    private final ReviewService reviews;

    public ReviewController(ReviewService reviews) {
        this.reviews = reviews;
    }

    /**
     * Principal is null for an anonymous reader, which is fine — it is only
     * used to mark which review is the caller's own.
     */
    @GetMapping("/api/plants/{slug}/reviews")
    public ReviewDtos.ReviewPage list(Principal principal, @PathVariable String slug,
                                      @RequestParam(defaultValue = "0") int page,
                                      @RequestParam(defaultValue = "10") int size) {
        return reviews.page(slug, page, size, principal == null ? null : principal.getName());
    }

    @GetMapping("/api/reviews/mine")
    public List<ReviewDtos.ReviewDto> mine(Principal principal) {
        return reviews.mine(principal.getName());
    }

    @GetMapping("/api/reviews/{slug}/eligibility")
    public ReviewDtos.Eligibility eligibility(Principal principal, @PathVariable String slug) {
        return reviews.eligibility(principal.getName(), slug);
    }

    @PostMapping("/api/reviews/{slug}")
    public ResponseEntity<ReviewDtos.ReviewDto> write(
            Principal principal, @PathVariable String slug,
            @Valid @RequestBody ReviewDtos.WriteRequest body) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(reviews.write(principal.getName(), slug, body));
    }

    @PutMapping("/api/reviews/{id}")
    public ReviewDtos.ReviewDto edit(Principal principal, @PathVariable Long id,
                                     @Valid @RequestBody ReviewDtos.WriteRequest body) {
        return reviews.edit(principal.getName(), id, body);
    }

    @DeleteMapping("/api/reviews/{id}")
    public ApiMessage delete(Principal principal, @PathVariable Long id) {
        reviews.delete(principal.getName(), id);
        return new ApiMessage("Your review has been removed.");
    }

    /**
     * Stores one photograph and returns its path, to be sent back with the
     * review body.
     *
     * Separate from the write for the same reason the product one is: pictures
     * upload while the customer is still typing, and a rejected file does not
     * throw away what they have written.
     *
     * Only customers who have received an order may post here. Any signed-in
     * account being able to write files to the server is a larger door than
     * this feature needs, and everyone who can legitimately review has a
     * delivery behind them by definition.
     */
    @PostMapping(value = "/api/reviews/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ReviewDtos.UploadedImage uploadImage(Principal principal,
                                                @RequestPart("file") MultipartFile file) {
        return reviews.uploadImage(principal.getName(), file);
    }
}
