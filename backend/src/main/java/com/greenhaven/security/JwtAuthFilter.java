package com.greenhaven.security;

import java.io.IOException;
import java.util.List;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.greenhaven.repository.AppUserRepository;
import com.greenhaven.service.AdminSessionService;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {
    private final JwtService jwt;
    private final AppUserRepository users;

    private final AdminSessionService sessions;

    public JwtAuthFilter(JwtService jwt, AppUserRepository users, AdminSessionService sessions) {
        this.sessions = sessions;
        this.jwt = jwt;
        this.users = users;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");

        if (header != null && header.startsWith("Bearer ")
                && SecurityContextHolder.getContext().getAuthentication() == null) {
            try {
                var claims = jwt.claims(header.substring(7));
                String email = claims.getSubject();
                String jti = claims.getId();

                users.findByEmail(email).ifPresent(user -> {
                    if (user.isBlocked()) return;

                    if ("ADMIN".equals(user.getRole()) && !sessions.isLive(jti)) return;

                    var authority = new SimpleGrantedAuthority("ROLE_" + user.getRole());
                    var auth = new UsernamePasswordAuthenticationToken(
                            user.getEmail(), null, List.of(authority));
                    SecurityContextHolder.getContext().setAuthentication(auth);
                });
            } catch (Exception ignored) {
            }
        }

        chain.doFilter(request, response);
    }
}
