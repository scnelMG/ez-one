package com.ezone.backend.domain;

import java.time.Instant;

public record UserSession(
    Long id,
    Long userId,
    String refreshTokenHash,
    Instant expiresAt,
    Instant revokedAt
) {
}
