package com.ezone.backend.dto.workspace;

import com.ezone.backend.domain.ReferenceType;

public record ReferenceResponse(
    Long id,
    String boardName,
    ReferenceType referenceType,
    String title,
    String body,
    String url
) {
}
