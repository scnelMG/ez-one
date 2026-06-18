package com.ezone.backend.dto.dart;

import java.util.List;

public record DartAnalysisContentResponse(
    List<EvidenceCard> evidenceCards,
    List<String> appealPoints,
    List<String> suggestedSentences,
    List<String> cautions,
    List<String> missingInfo
) {
    public record EvidenceCard(
        String title,
        String summary,
        String sourceSection,
        String rceptNo,
        int relevanceScore
    ) {
    }

    public static DartAnalysisContentResponse empty() {
        return new DartAnalysisContentResponse(List.of(), List.of(), List.of(), List.of(), List.of());
    }
}
