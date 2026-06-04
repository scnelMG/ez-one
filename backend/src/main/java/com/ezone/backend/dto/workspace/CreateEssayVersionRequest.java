package com.ezone.backend.dto.workspace;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateEssayVersionRequest(
    @NotNull Long questionId,
    @NotBlank String versionName
) {
}
