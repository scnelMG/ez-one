package com.ezone.backend.dto.profile;

public record DocumentCustomFieldResponse(
    Long id,
    String label,
    String fieldType,
    String value
) {
}
