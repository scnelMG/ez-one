package com.ezone.backend.dto.extension;

import java.util.List;

public record ApplicationActivityRecommendation(
    int rank,
    String title,
    int fitScore,
    String recruiterView,
    String practitionerView,
    List<String> appealPoints,
    List<String> risks,
    List<ApplicationActivityRecommendationDraft> drafts
) {
}
