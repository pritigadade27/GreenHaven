package com.greenhaven.dto;

/** A user as the client may see them. Never carries the password hash. */
public record UserDto(Long id, String fullName, String email, String role) {
}
