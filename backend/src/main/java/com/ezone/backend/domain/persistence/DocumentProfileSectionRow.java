package com.ezone.backend.domain.persistence;

public record DocumentProfileSectionRow(
    Long userId,
    String sectionType,
    String payloadJson,
    String updatedAt
) {
}
