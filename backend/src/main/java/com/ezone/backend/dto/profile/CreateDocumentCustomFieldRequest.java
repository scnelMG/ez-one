package com.ezone.backend.dto.profile;

import jakarta.validation.constraints.NotBlank;

public record CreateDocumentCustomFieldRequest(
    @NotBlank String label,
    @NotBlank String fieldType,
    String value
) {
}
