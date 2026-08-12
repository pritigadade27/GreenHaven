package com.greenhaven.config;

import java.util.Arrays;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

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

        // Dev origins plus configured ones
        this.allowed = new String[DEV_ORIGINS.length + extra.length];
        System.arraycopy(DEV_ORIGINS, 0, allowed, 0, DEV_ORIGINS.length);
        System.arraycopy(extra, 0, allowed, DEV_ORIGINS.length, extra.length);
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        // Allow credentialed API calls
        registry.addMapping("/api/**")
                .allowedOrigins(allowed)
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600);

        registry.addMapping("/uploads/**")
                .allowedOrigins(allowed)
                .allowedMethods("GET")
                .maxAge(3600);
    }
}
