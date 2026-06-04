package com.ezone.backend.dto.workspace;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

public record CreateEssayQuestionRequest(
    @NotBlank String prompt,
    @Positive int maxLength
) {
}
