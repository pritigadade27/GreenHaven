package com.greenhaven.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
// Without this, @PreAuthorize is silently ignored — the annotation compiles, reads as protection, and enforces nothing.
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthFilter jwtFilter;

    public SecurityConfig(JwtAuthFilter jwtFilter) {
        this.jwtFilter = jwtFilter;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // No cookies and no server session: the client holds a bearer token, so CSRF has nothing to forge.
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> { })
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                    .requestMatchers(HttpMethod.GET,
                            "/api/plants/**", "/api/categories/**", "/api/badges/**").permitAll()
                    .requestMatchers(HttpMethod.POST,
                            "/api/auth/**", "/api/contact", "/api/newsletter").permitAll()
                    .requestMatchers("/error", "/actuator/health").permitAll()
                    // Product photographs are as public as the pages they appear on.
                    .requestMatchers(HttpMethod.GET, "/uploads/**").permitAll()
                    // Checking whether a reset link is still good happens before anyone can possibly be signed in.
                    .requestMatchers(HttpMethod.GET, "/api/auth/reset-password").permitAll()
                    // Razorpay carries no bearer token.
                    .requestMatchers(HttpMethod.POST, "/api/webhooks/razorpay").permitAll()
                    // Sign-in has to be reachable without a token, or there is no way to obtain one.
                    .requestMatchers(HttpMethod.POST, "/api/admin/auth/login").permitAll()
                    // Every other admin endpoint, in one place.
                    .requestMatchers("/api/admin/**").hasRole("ADMIN")
                    .anyRequest().authenticated())
            .httpBasic(AbstractHttpConfigurer::disable)
            .formLogin(AbstractHttpConfigurer::disable)
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
        // RateLimitFilter is NOT registered here on purpose.

        return http.build();
    }
}
