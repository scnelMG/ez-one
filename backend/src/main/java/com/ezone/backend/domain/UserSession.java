package com.ezone.backend.domain;

import java.time.Instant;

public record UserSession(
    Long userId,
    String refreshTokenHash,
    Instant expiresAt
) {
}
