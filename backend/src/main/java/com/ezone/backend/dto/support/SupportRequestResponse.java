package com.ezone.backend.dto.support;

import java.time.Instant;

public record SupportRequestResponse(
    Long id,
    String requestType,
    String category,
    String title,
    String body,
    String status,
    Instant createdAt
) {
}
