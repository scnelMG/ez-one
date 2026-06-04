package com.ezone.backend.dto.workspace;

public record EssayQuestionResponse(
    Long id,
    String prompt,
    String draft,
    int maxLength,
    int currentLength
) {
}
