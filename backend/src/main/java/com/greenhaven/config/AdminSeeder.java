package com.greenhaven.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.greenhaven.entity.AppUser;
import com.greenhaven.repository.AppUserRepository;

@Configuration
public class AdminSeeder {
    private static final Logger log = LoggerFactory.getLogger(AdminSeeder.class);

    @Bean
    ApplicationRunner seedAdmin(AppUserRepository users, PasswordEncoder encoder,
                                @Value("${greenhaven.admin.email:}") String email,
                                @Value("${greenhaven.admin.password:}") String password,
                                @Value("${greenhaven.admin.name:Green Haven Admin}") String name) {
        return args -> {
            if (email == null || email.isBlank() || password == null || password.isBlank()) {
                log.info("No admin credentials configured — skipping admin seed.");
                return;
            }

            // Never overwrite an existing admin
            String normalised = email.trim().toLowerCase();
            if (users.existsByEmail(normalised)) {
                log.info("Admin account already exists; leaving it untouched.");
                return;
            }

            // Enforce minimum password strength
            if (password.length() < 8) {
                log.error("ADMIN_PASSWORD is shorter than 8 characters — admin NOT created.");
                return;
            }
            if (password.length() < 12) {
                log.warn("ADMIN_PASSWORD is under 12 characters. Consider a longer one.");
            }

            // Create the seeded admin
            AppUser admin = new AppUser();
            admin.setFullName(name.trim());
            admin.setEmail(normalised);
            admin.setPasswordHash(encoder.encode(password));
            admin.setRole("ADMIN");
            users.save(admin);

            log.info("Admin account created for {}", normalised);
        };
    }
}
