package com.greenhaven;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableScheduling
@SpringBootApplication
public class GreenHavenApplication {
    public static void main(String[] args) {
        SpringApplication.run(GreenHavenApplication.class, args);
    }
}
