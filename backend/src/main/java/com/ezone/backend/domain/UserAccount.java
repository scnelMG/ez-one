package com.ezone.backend.domain;

public record UserAccount(
    Long id,
    String googleSubject,
    String email,
    String name,
    String nickname,
    String profileImageUrl,
    boolean profileCompleted
) {
    public UserAccount(
        Long id,
        String googleSubject,
        String email,
        String name,
        String nickname,
        boolean profileCompleted
    ) {
        this(id, googleSubject, email, name, nickname, null, profileCompleted);
    }
}
