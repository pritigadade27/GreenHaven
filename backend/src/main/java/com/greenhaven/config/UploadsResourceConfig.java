package com.greenhaven.config;

import java.nio.file.Paths;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Serves uploaded product photographs off disk.
 *
 * Read-only and outside /api, so it needs no token: a product photograph is as
 * public as the product page it appears on. Writing is another matter and lives
 * behind ROLE_ADMIN in ProductAdminController.
 */
@Configuration
public class UploadsResourceConfig implements WebMvcConfigurer {

    private final String dir;
    private final String publicPath;

    public UploadsResourceConfig(@Value("${greenhaven.uploads.dir:uploads}") String dir,
                                 @Value("${greenhaven.uploads.public-path:/uploads}") String publicPath) {
        this.dir = dir;
        this.publicPath = publicPath;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String location = Paths.get(dir).toAbsolutePath().normalize().toUri().toString();
        registry.addResourceHandler(publicPath + "/**")
                .addResourceLocations(location)
                // Uploaded files are content-addressed by a random name, so a
                // given URL never changes and can be cached hard.
                .setCachePeriod(60 * 60 * 24 * 30);
    }
}
