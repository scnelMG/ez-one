package com.ezone.backend.dto.auth;

public record CurrentUserResponse(
    Long id,
    String email,
    String name,
    String nickname,
    boolean profileCompleted,
    boolean onboardingRequired
) {
}
