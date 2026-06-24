package com.ezone.backend.dto.dart;

import java.util.List;

public record DartAnalysisContentResponse(
    List<EvidenceCard> evidenceCards,
    List<String> appealPoints,
    List<String> suggestedSentences,
    List<String> cautions,
    List<String> missingInfo,
    DartSectionAnalysis mainProductsAndServices,
    DartSectionAnalysis contractsAndRAndD,
    DartSectionAnalysis otherNotes
) {
    public DartAnalysisContentResponse(
        List<EvidenceCard> evidenceCards,
        List<String> appealPoints,
        List<String> suggestedSentences,
        List<String> cautions,
        List<String> missingInfo
    ) {
        this(
            evidenceCards,
            appealPoints,
            suggestedSentences,
            cautions,
            missingInfo,
            DartSectionAnalysis.empty("주요 제품 및 서비스"),
            DartSectionAnalysis.empty("주요 계약 및 연구 개발 활동"),
            DartSectionAnalysis.empty("기타 참고사항")
        );
    }

    public record EvidenceCard(
        String title,
        String summary,
        String sourceSection,
        String rceptNo,
        int relevanceScore
    ) {
    }

    public record DartSectionAnalysis(
        String sectionTitle,
        String coreSummary,
        List<String> evidencePoints,
        List<String> jobFitPoints,
        List<ResumeUsePoint> resumeUsePoints,
        List<String> sentenceCandidates,
        List<String> cautionPoints,
        String rawText
    ) {
        public static DartSectionAnalysis empty(String sectionTitle) {
            return new DartSectionAnalysis(sectionTitle, "", List.of(), List.of(), List.of(), List.of(), List.of(), "");
        }
    }

    public record ResumeUsePoint(
        String useCase,
        String recommendation
    ) {
    }

    public static DartAnalysisContentResponse empty() {
        return new DartAnalysisContentResponse(
            List.of(),
            List.of(),
            List.of(),
            List.of(),
            List.of(),
            DartSectionAnalysis.empty("주요 제품 및 서비스"),
            DartSectionAnalysis.empty("주요 계약 및 연구 개발 활동"),
            DartSectionAnalysis.empty("기타 참고사항")
        );
    }
}
