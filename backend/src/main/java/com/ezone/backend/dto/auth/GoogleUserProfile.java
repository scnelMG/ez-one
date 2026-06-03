package com.ezone.backend.dto.auth;

public record GoogleUserProfile(
    String subject,
    String email,
    String name,
    String nickname
) {
}
