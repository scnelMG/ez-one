package com.ezone.backend.security;

public record JwtAuthenticatedUser(Long userId, String email) {
}
