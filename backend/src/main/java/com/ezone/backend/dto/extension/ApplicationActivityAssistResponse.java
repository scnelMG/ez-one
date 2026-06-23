package com.ezone.backend.dto.extension;

import java.util.List;

public record ApplicationActivityAssistResponse(
    List<ApplicationActivityRecommendation> recommendations,
    List<String> warnings
) {
}
