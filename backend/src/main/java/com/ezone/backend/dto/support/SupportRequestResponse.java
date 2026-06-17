package com.ezone.backend.dto.support;

import java.time.Instant;

public record SupportRequestResponse(
    Long id,
    String requestType,
    String category,
    String title,
    String body,
    String companyName,
    String contactName,
    String contactEmail,
    String contactPhone,
    String status,
    Instant createdAt
) {
}
