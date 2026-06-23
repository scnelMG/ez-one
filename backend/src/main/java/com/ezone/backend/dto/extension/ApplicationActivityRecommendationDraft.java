package com.ezone.backend.dto.extension;

public record ApplicationActivityRecommendationDraft(
    String label,
    String text,
    int charCount,
    int byteCount,
    boolean exceedsLimit
) {
}
