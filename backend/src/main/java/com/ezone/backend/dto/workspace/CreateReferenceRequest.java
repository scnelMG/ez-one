package com.ezone.backend.dto.workspace;

import com.ezone.backend.domain.ReferenceType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateReferenceRequest(
    @NotBlank String boardName,
    @NotNull ReferenceType referenceType,
    @NotBlank String title,
    String body,
    String url
) {
}
