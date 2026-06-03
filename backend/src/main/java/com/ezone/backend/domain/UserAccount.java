package com.ezone.backend.domain;

public record UserAccount(
    Long id,
    String googleSubject,
    String email,
    String name,
    String nickname,
    boolean profileCompleted
) {
}
