package com.greenhaven.security;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Arrays;
import java.util.Deque;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.security.SecurityProperties;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
@Order(SecurityProperties.DEFAULT_FILTER_ORDER - 1)
public class RateLimitFilter extends OncePerRequestFilter {
    private record Rule(String method, String path, int limit, Duration window) {
        boolean matches(String method, String path) {
            return this.method.equals(method) && this.path.equals(path);
        }
    }

    private static String normalise(String uri) {
        int semi = uri.indexOf(';');
        if (semi >= 0) uri = uri.substring(0, semi);
        while (uri.length() > 1 && uri.endsWith("/")) uri = uri.substring(0, uri.length() - 1);
        return uri;
    }

    private final Map<String, Deque<Instant>> hits = new ConcurrentHashMap<>();
    private final Rule[] rules;
    private final Set<String> trustedProxies;

    private volatile Instant lastSweep = Instant.EPOCH;

    public RateLimitFilter(
            @Value("${greenhaven.ratelimit.login-per-15min:8}") int loginLimit,
            @Value("${greenhaven.ratelimit.register-per-hour:5}") int registerLimit,
            @Value("${greenhaven.ratelimit.forms-per-hour:10}") int formLimit,
            @Value("${greenhaven.ratelimit.checkout-per-hour:30}") int checkoutLimit,
            @Value("${greenhaven.ratelimit.coupon-per-15min:15}") int couponLimit,
            @Value("${greenhaven.ratelimit.trusted-proxies:}") String trustedProxies) {
        this.rules = new Rule[] {
            new Rule("POST", "/api/auth/login", loginLimit, Duration.ofMinutes(15)),
            new Rule("POST", "/api/admin/auth/login", 5, Duration.ofMinutes(15)),
            new Rule("POST", "/api/auth/register", registerLimit, Duration.ofHours(1)),
            new Rule("POST", "/api/auth/forgot-password", 5, Duration.ofHours(1)),
            new Rule("POST", "/api/auth/reset-password", 10, Duration.ofHours(1)),
            new Rule("POST", "/api/contact", formLimit, Duration.ofHours(1)),
            new Rule("POST", "/api/newsletter", formLimit, Duration.ofHours(1)),
            new Rule("POST", "/api/orders", checkoutLimit, Duration.ofHours(1)),
            new Rule("POST", "/api/reviews/image", 20, Duration.ofHours(1)),
            new Rule("POST", "/api/coupons/quote", couponLimit, Duration.ofMinutes(15)),
        };

        this.trustedProxies = Arrays.stream(trustedProxies.split(","))
                .map(String::trim).filter(v -> !v.isEmpty()).collect(Collectors.toUnmodifiableSet());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String path = normalise(request.getRequestURI());
        String method = request.getMethod();

        Rule rule = null;
        for (Rule candidate : rules) {
            if (candidate.matches(method, path)) {
                rule = candidate;
                break;
            }
        }

        if (rule == null) {
            chain.doFilter(request, response);
            return;
        }

        Instant now = Instant.now();
        sweep(now);

        String key = rule.path() + '|' + clientIp(request);
        Deque<Instant> recent = hits.computeIfAbsent(key, k -> new ArrayDeque<>());

        long retryAfter;
        synchronized (recent) {
            Instant cutoff = now.minus(rule.window());
            while (!recent.isEmpty() && recent.peekFirst().isBefore(cutoff)) {
                recent.pollFirst();
            }

            if (recent.size() < rule.limit()) {
                recent.addLast(now);
                chain.doFilter(request, response);
                return;
            }

            retryAfter = Math.max(1,
                    Duration.between(now, recent.peekFirst().plus(rule.window())).getSeconds());
        }

        long minutes = Math.max(1, retryAfter / 60);
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setHeader("Retry-After", String.valueOf(retryAfter));
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write("""
                {"status":429,"message":"Too many attempts. Please try again in about %d minute%s."}"""
                .formatted(minutes, minutes == 1 ? "" : "s"));
    }

    private void sweep(Instant now) {
        if (Duration.between(lastSweep, now).toMinutes() < 1) return;
        lastSweep = now;

        Instant dead = now.minus(Duration.ofHours(1));
        hits.entrySet().removeIf(entry -> {
            Deque<Instant> deque = entry.getValue();
            synchronized (deque) {
                return deque.isEmpty() || deque.peekLast().isBefore(dead);
            }
        });
    }

    private String clientIp(HttpServletRequest request) {
        String peer = request.getRemoteAddr();
        if (trustedProxies.isEmpty() || !trustedProxies.contains(peer)) {
            return peer;
        }

        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded == null || forwarded.isBlank()) {
            return peer;
        }
        int comma = forwarded.lastIndexOf(',');
        return (comma >= 0 ? forwarded.substring(comma + 1) : forwarded).trim();
    }
}
