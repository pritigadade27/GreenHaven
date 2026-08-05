package com.greenhaven.dto;

public record AuthResponse(String token, long expiresInMs, UserDto user) {
}
