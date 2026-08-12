package com.greenhaven.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Stream;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.greenhaven.repository.ReviewImageRepository;

/** Removes review photographs that were uploaded but never attached to anything. */
@Service
public class OrphanUploadSweeper {

    private static final Logger log = LoggerFactory.getLogger(OrphanUploadSweeper.class);

    private final ReviewImageRepository images;
    private final Path reviewsDir;
    private final String publicPrefix;
    private final Duration grace;
    private final boolean enabled;

    public OrphanUploadSweeper(ReviewImageRepository images,
                               @Value("${greenhaven.uploads.dir:uploads}") String dir,
                               @Value("${greenhaven.uploads.public-path:/uploads}") String publicPrefix,
                               @Value("${greenhaven.uploads.orphan-grace-hours:24}") int graceHours,
                               @Value("${greenhaven.uploads.sweep-orphans:true}") boolean enabled) {
        this.images = images;
        this.reviewsDir = Paths.get(dir).toAbsolutePath().normalize().resolve(UploadService.REVIEWS);
        this.publicPrefix = publicPrefix;
        this.grace = Duration.ofHours(graceHours);
        this.enabled = enabled;
    }

    /** Once an hour. */
    @Scheduled(initialDelayString = "${greenhaven.uploads.sweep-initial-delay:PT5M}",
               fixedDelayString = "${greenhaven.uploads.sweep-interval:PT1H}")
    public void scheduled() {
        if (!enabled) return;
        try {
            int removed = sweep();
            if (removed > 0) log.info("Removed {} unattached review photograph(s).", removed);
        } catch (RuntimeException e) {
            // A scheduled task that throws can be silently unscheduled by Spring.
            log.error("Orphan upload sweep failed: {}", e.getMessage());
        }
    }

    /** Exposed so it can be run on demand and tested. Returns how many went. */
    @Transactional(readOnly = true)
    public int sweep() {
        if (!Files.isDirectory(reviewsDir)) return 0;

        String prefix = publicPrefix + "/" + UploadService.REVIEWS + "/";
        Set<String> referenced = new HashSet<>();
        for (var image : images.findAll()) {
            String url = image.getUrl();
            if (url != null && url.startsWith(prefix)) {
                referenced.add(url.substring(prefix.length()));
            }
        }

        Instant cutoff = Instant.now().minus(grace);
        int removed = 0;
        try (Stream<Path> files = Files.list(reviewsDir)) {
            for (Path file : files.toList()) {
                if (!Files.isRegularFile(file)) continue;
                if (referenced.contains(file.getFileName().toString())) continue;
                if (Files.getLastModifiedTime(file).toInstant().isAfter(cutoff)) continue;
                Files.deleteIfExists(file);
                removed++;
            }
        } catch (IOException e) {
            log.warn("Could not sweep {}: {}", reviewsDir, e.getMessage());
        }
        return removed;
    }
}
