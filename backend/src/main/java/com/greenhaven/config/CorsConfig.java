package com.greenhaven.config;

import java.util.Arrays;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Which origins may call the API.
 *
 * The two Vite ports are always allowed so local development needs no
 * configuration at all. Deployed environments add their own domain through
 * CORS_ALLOWED_ORIGINS, because in production the React build and the API sit
 * on different hosts and the browser blocks the call otherwise.
 *
 * Deliberately a list rather than "*": credentials are allowed on these
 * requests, and a wildcard with credentials is both refused by the browser and
 * an invitation for any site to call this API with a visitor's token.
 */
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    private static final String[] DEV_ORIGINS = {
            "http://localhost:5173",
            "http://localhost:4173",
            "http://127.0.0.1:5173",
    };

    private final String[] allowed;

    public CorsConfig(@Value("${greenhaven.cors.allowed-origins:}") String configured) {
        String[] extra = Arrays.stream(configured.split(","))
                .map(String::trim)
                .filter(o -> !o.isEmpty())
                .toArray(String[]::new);

        this.allowed = new String[DEV_ORIGINS.length + extra.length];
        System.arraycopy(DEV_ORIGINS, 0, allowed, 0, DEV_ORIGINS.length);
        System.arraycopy(extra, 0, allowed, DEV_ORIGINS.length, extra.length);
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(allowed)
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600);

        // Uploaded photographs are fetched by the same deployed frontend.
        registry.addMapping("/uploads/**")
                .allowedOrigins(allowed)
                .allowedMethods("GET")
                .maxAge(3600);
    }
}
