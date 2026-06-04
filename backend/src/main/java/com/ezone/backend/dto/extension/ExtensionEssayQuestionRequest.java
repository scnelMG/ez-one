package com.ezone.backend.dto.extension;

public record ExtensionEssayQuestionRequest(
    String prompt,
    Integer maxLength
) {
    public int maxLengthOrDefault() {
        return maxLength == null || maxLength <= 0 ? 1000 : maxLength;
    }
}
