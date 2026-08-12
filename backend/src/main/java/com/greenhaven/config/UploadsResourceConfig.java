package com.greenhaven.config;

import java.nio.file.Paths;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

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
                .setCachePeriod(60 * 60 * 24 * 30);
    }
}
