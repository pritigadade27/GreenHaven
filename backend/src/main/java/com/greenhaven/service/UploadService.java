package com.greenhaven.service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

import javax.imageio.ImageIO;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import jakarta.annotation.PostConstruct;

/** Uploaded photographs, on local disk. */
@Service
public class UploadService {

    private static final Logger log = LoggerFactory.getLogger(UploadService.class);

    /** What a browser will render and what we are willing to store. */
    private static final Set<String> ALLOWED = Set.of("image/jpeg", "image/png", "image/webp");
    private static final long MAX_BYTES = 5L * 1024 * 1024;

    public static final String PRODUCTS = "products";
    public static final String REVIEWS = "reviews";

    /** The only folders that may be written or deleted. */
    private static final Set<String> FOLDERS = Set.of(PRODUCTS, REVIEWS);

    private final Path root;
    private final String publicPrefix;

    public UploadService(@Value("${greenhaven.uploads.dir:uploads}") String dir,
                         @Value("${greenhaven.uploads.public-path:/uploads}") String publicPrefix) {
        this.root = Paths.get(dir).toAbsolutePath().normalize();
        this.publicPrefix = publicPrefix;
    }

    @PostConstruct
    void ensureDirectory() {
        try {
            for (String folder : FOLDERS) {
                Files.createDirectories(root.resolve(folder));
            }
            log.info("Uploads directory: {}", root);
        } catch (IOException e) {
            log.error("Could not create the uploads directory at {}: {}", root, e.getMessage());
        }
    }

    public String storeProductImage(MultipartFile file) {
        return store(file, PRODUCTS);
    }

    public String storeReviewImage(MultipartFile file) {
        return store(file, REVIEWS);
    }

    /** Stores one image and returns the path the storefront should use. */
    private String store(MultipartFile file, String folder) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Choose an image to upload.");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new IllegalArgumentException("Images must be 5 MB or smaller.");
        }

        String declared = file.getContentType() == null
                ? "" : file.getContentType().toLowerCase(Locale.ROOT);
        if (!ALLOWED.contains(declared)) {
            throw new IllegalArgumentException("Upload a JPEG, PNG or WebP image.");
        }

        // The declared type is just a header the client chose.
        try (InputStream probe = file.getInputStream()) {
            if (ImageIO.read(probe) == null) {
                throw new IllegalArgumentException("That file is not a readable image.");
            }
        } catch (IOException e) {
            throw new IllegalArgumentException("That image could not be read.");
        }

        String extension = switch (declared) {
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            default -> ".jpg";
        };
        String name = UUID.randomUUID().toString().replace("-", "") + extension;
        Path target = root.resolve(folder).resolve(name).normalize();

        // Belt and braces against traversal: whatever the name resolved to, it must still sit inside the.
        if (!target.startsWith(root)) {
            throw new IllegalArgumentException("That filename is not allowed.");
        }

        try (InputStream in = file.getInputStream()) {
            Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new IllegalStateException("The image could not be saved.", e);
        }

        return publicPrefix + "/" + folder + "/" + name;
    }

    /** Whether a path names a review photograph this service actually stored. */
    public boolean isStoredReviewImage(String publicPath) {
        String prefix = publicPrefix + "/" + REVIEWS + "/";
        if (publicPath == null || !publicPath.startsWith(prefix)) return false;

        String name = publicPath.substring(prefix.length());
        if (name.isEmpty() || name.contains("/") || name.contains("\\") || name.contains("..")) {
            return false;
        }
        Path target = root.resolve(REVIEWS).resolve(name).normalize();
        return target.startsWith(root.resolve(REVIEWS)) && Files.isRegularFile(target);
    }

    /** Removes a previously uploaded file. */
    public void deleteQuietly(String publicPath) {
        if (publicPath == null) return;
        for (String folder : FOLDERS) {
            String prefix = publicPrefix + "/" + folder + "/";
            if (!publicPath.startsWith(prefix)) continue;
            try {
                String name = publicPath.substring(prefix.length());
                Path target = root.resolve(folder).resolve(name).normalize();
                if (target.startsWith(root.resolve(folder))) Files.deleteIfExists(target);
            } catch (Exception e) {
                log.warn("Could not remove {}: {}", publicPath, e.getMessage());
            }
            return;
        }
    }
}
