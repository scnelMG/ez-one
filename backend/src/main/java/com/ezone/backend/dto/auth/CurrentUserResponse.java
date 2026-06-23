package com.ezone.backend.dto.auth;

public record CurrentUserResponse(
    Long id,
    String email,
    String name,
    String nickname,
    String profileImageUrl,
    boolean profileCompleted,
    boolean onboardingRequired
) {
    public CurrentUserResponse(
        Long id,
        String email,
        String name,
        String nickname,
        boolean profileCompleted,
        boolean onboardingRequired
    ) {
        this(id, email, name, nickname, null, profileCompleted, onboardingRequired);
    }
}
