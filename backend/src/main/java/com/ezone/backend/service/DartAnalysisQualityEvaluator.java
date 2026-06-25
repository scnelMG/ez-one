package com.ezone.backend.service;

import com.ezone.backend.dto.dart.DartAnalysisContentResponse;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class DartAnalysisQualityEvaluator {

    private static final List<String> PROHIBITED_TERMS = List.of(
        "stock price",
        "target price",
        "investment advice",
        "buy rating",
        "sell rating",
        "hiring probability",
        "acceptance probability",
        "주가",
        "목표주가",
        "투자 조언",
        "투자판단",
        "매수",
        "매도",
        "합격 가능성",
        "합격률"
    );
    private static final List<String> ACCOUNTING_NOISE_TERMS = List.of(
        "내부회계관리제도",
        "적정의견",
        "회수가능가액",
        "손상검사",
        "손상차손",
        "계약자산",
        "계약부채",
        "수익 인식",
        "수익인식",
        "리스 회계",
        "감사보고서",
        "독립된 감사인",
        "재무제표 주석",
        "impairment",
        "recoverable amount",
        "contract asset",
        "contract liability",
        "revenue recognition",
        "lease accounting",
        "audit opinion",
        "internal control"
    );

    public DartAnalysisEvaluation evaluate(DartAnalysisContentResponse content, String expectedRceptNo) {
        DartAnalysisContentResponse source = content == null ? DartAnalysisContentResponse.empty() : content;
        List<String> notes = new ArrayList<>();
        List<DartAnalysisContentResponse.EvidenceCard> evidenceCards = cleanEvidenceCards(
            source.evidenceCards(),
            expectedRceptNo,
            notes
        );
        List<String> appealPoints = cleanTextList(source.appealPoints(), notes);
        List<String> suggestedSentences = cleanTextList(source.suggestedSentences(), notes);
        List<String> cautions = new ArrayList<>(nonBlankDistinct(source.cautions()));
        List<String> missingInfo = new ArrayList<>(nonBlankDistinct(source.missingInfo()));
        DartAnalysisContentResponse.DartSectionAnalysis mainProductsAndServices = cleanSectionAnalysis(
            source.mainProductsAndServices(),
            "주요 제품 및 서비스",
            notes
        );
        DartAnalysisContentResponse.DartSectionAnalysis contractsAndRAndD = cleanSectionAnalysis(
            source.contractsAndRAndD(),
            "주요 계약 및 연구 개발 활동",
            notes
        );
        DartAnalysisContentResponse.DartSectionAnalysis otherNotes = cleanSectionAnalysis(
            source.otherNotes(),
            "기타 참고사항",
            notes
        );
        boolean hasStructuredEvidence = hasStructuredEvidence(mainProductsAndServices, contractsAndRAndD, otherNotes);

        if (evidenceCards.isEmpty() && !hasStructuredEvidence) {
            missingInfo.add("No source-grounded DART evidence card passed the quality gate.");
            notes.add("quality gate: no valid evidence card");
        }
        if (!notes.isEmpty()) {
            cautions.add("AI quality gate adjusted the analysis. Review source sections before using this in an essay.");
        }

        int score = score(evidenceCards, appealPoints, suggestedSentences, notes, hasStructuredEvidence);
        DartAnalysisContentResponse improved = new DartAnalysisContentResponse(
            evidenceCards,
            appealPoints,
            suggestedSentences,
            nonBlankDistinct(cautions),
            nonBlankDistinct(missingInfo),
            mainProductsAndServices,
            contractsAndRAndD,
            otherNotes
        );
        return new DartAnalysisEvaluation(!evidenceCards.isEmpty() || hasStructuredEvidence, score, improved, List.copyOf(notes));
    }

    private List<DartAnalysisContentResponse.EvidenceCard> cleanEvidenceCards(
        List<DartAnalysisContentResponse.EvidenceCard> cards,
        String expectedRceptNo,
        List<String> notes
    ) {
        List<DartAnalysisContentResponse.EvidenceCard> cleaned = new ArrayList<>();
        for (DartAnalysisContentResponse.EvidenceCard card : cards == null ? List.<DartAnalysisContentResponse.EvidenceCard>of() : cards) {
            if (card == null
                || !StringUtils.hasText(card.title())
                || !StringUtils.hasText(card.summary())
                || !StringUtils.hasText(card.sourceSection())
                || !StringUtils.hasText(card.rceptNo())
                || !card.rceptNo().equals(expectedRceptNo)) {
                notes.add("quality gate: removed ungrounded evidence card");
                continue;
            }
            if (containsProhibitedText(card.title(), card.summary(), card.sourceSection())) {
                notes.add("quality gate: removed prohibited evidence wording");
                continue;
            }
            if (containsAccountingNoise(card.title(), card.summary(), card.sourceSection())) {
                notes.add("quality gate: removed accounting-only DART evidence");
                continue;
            }
            cleaned.add(new DartAnalysisContentResponse.EvidenceCard(
                card.title().trim(),
                card.summary().trim(),
                card.sourceSection().trim(),
                card.rceptNo().trim(),
                clampScore(card.relevanceScore())
            ));
        }
        cleaned.sort(Comparator.comparingInt(DartAnalysisContentResponse.EvidenceCard::relevanceScore).reversed());
        return List.copyOf(cleaned);
    }

    private DartAnalysisContentResponse.DartSectionAnalysis cleanSectionAnalysis(
        DartAnalysisContentResponse.DartSectionAnalysis section,
        String fallbackTitle,
        List<String> notes
    ) {
        if (section == null) {
            return DartAnalysisContentResponse.DartSectionAnalysis.empty(fallbackTitle);
        }
        List<DartAnalysisContentResponse.ResumeUsePoint> resumeUsePoints = new ArrayList<>();
        for (DartAnalysisContentResponse.ResumeUsePoint point : section.resumeUsePoints() == null
            ? List.<DartAnalysisContentResponse.ResumeUsePoint>of()
            : section.resumeUsePoints()) {
            if (point == null) {
                continue;
            }
            if (containsAccountingNoise(point.useCase(), point.recommendation())) {
                notes.add("quality gate: removed accounting-only DART use point");
                continue;
            }
            if (StringUtils.hasText(point.useCase()) || StringUtils.hasText(point.recommendation())) {
                resumeUsePoints.add(new DartAnalysisContentResponse.ResumeUsePoint(
                    defaultText(point.useCase()).trim(),
                    defaultText(point.recommendation()).trim()
                ));
            }
        }
        return new DartAnalysisContentResponse.DartSectionAnalysis(
            StringUtils.hasText(section.sectionTitle()) ? section.sectionTitle().trim() : fallbackTitle,
            containsAccountingNoise(section.coreSummary()) ? "" : defaultText(section.coreSummary()).trim(),
            cleanSectionTextList(section.evidencePoints(), notes),
            cleanSectionTextList(section.jobFitPoints(), notes),
            List.copyOf(resumeUsePoints),
            cleanSectionTextList(section.sentenceCandidates(), notes),
            cleanTextList(section.cautionPoints(), notes),
            containsAccountingNoise(section.rawText()) ? "" : defaultText(section.rawText()).trim()
        );
    }

    private List<String> cleanSectionTextList(List<String> values, List<String> notes) {
        List<String> cleaned = new ArrayList<>();
        for (String value : values == null ? List.<String>of() : values) {
            if (!StringUtils.hasText(value)) {
                continue;
            }
            if (containsProhibitedText(value)) {
                notes.add("quality gate: removed prohibited generated section text");
                continue;
            }
            if (containsAccountingNoise(value)) {
                notes.add("quality gate: removed accounting-only DART section text");
                continue;
            }
            cleaned.add(value.trim());
        }
        return nonBlankDistinct(cleaned);
    }

    private List<String> cleanTextList(List<String> values, List<String> notes) {
        List<String> cleaned = new ArrayList<>();
        for (String value : values == null ? List.<String>of() : values) {
            if (!StringUtils.hasText(value)) {
                continue;
            }
            if (containsProhibitedText(value)) {
                notes.add("quality gate: removed prohibited generated sentence");
                continue;
            }
            if (containsAccountingNoise(value)) {
                notes.add("quality gate: removed accounting-only generated sentence");
                continue;
            }
            cleaned.add(value.trim());
        }
        return nonBlankDistinct(cleaned);
    }

    private int score(
        List<DartAnalysisContentResponse.EvidenceCard> evidenceCards,
        List<String> appealPoints,
        List<String> suggestedSentences,
        List<String> notes,
        boolean hasStructuredEvidence
    ) {
        int score = 0;
        if (!evidenceCards.isEmpty() || hasStructuredEvidence) {
            score += 40;
        }
        if (evidenceCards.stream().allMatch((card) -> StringUtils.hasText(card.sourceSection()))) {
            score += 20;
        }
        if (!appealPoints.isEmpty()) {
            score += 20;
        }
        if (!suggestedSentences.isEmpty()) {
            score += 10;
        }
        if (notes.isEmpty()) {
            score += 10;
        }
        return Math.min(score, 100);
    }

    private boolean hasStructuredEvidence(DartAnalysisContentResponse.DartSectionAnalysis... sections) {
        for (DartAnalysisContentResponse.DartSectionAnalysis section : sections) {
            if (hasSectionEvidence(section)) {
                return true;
            }
        }
        return false;
    }

    private boolean hasSectionEvidence(DartAnalysisContentResponse.DartSectionAnalysis section) {
        return section != null
            && (
                StringUtils.hasText(section.coreSummary())
                || (section.evidencePoints() != null && !section.evidencePoints().isEmpty())
                || (section.resumeUsePoints() != null && !section.resumeUsePoints().isEmpty())
            );
    }

    private List<String> nonBlankDistinct(List<String> values) {
        Set<String> distinct = new LinkedHashSet<>();
        for (String value : values == null ? List.<String>of() : values) {
            if (StringUtils.hasText(value)) {
                distinct.add(value.trim());
            }
        }
        return List.copyOf(distinct);
    }

    private boolean containsProhibitedText(String... values) {
        for (String value : values) {
            if (!StringUtils.hasText(value)) {
                continue;
            }
            String normalized = value.toLowerCase(Locale.ROOT);
            for (String term : PROHIBITED_TERMS) {
                if (normalized.contains(term.toLowerCase(Locale.ROOT))) {
                    return true;
                }
            }
        }
        return false;
    }

    private boolean containsAccountingNoise(String... values) {
        for (String value : values) {
            if (!StringUtils.hasText(value)) {
                continue;
            }
            String normalized = value.toLowerCase(Locale.ROOT);
            for (String term : ACCOUNTING_NOISE_TERMS) {
                if (normalized.contains(term.toLowerCase(Locale.ROOT))) {
                    return true;
                }
            }
        }
        return false;
    }

    private String defaultText(String value) {
        return StringUtils.hasText(value) ? value : "";
    }

    private int clampScore(int score) {
        if (score < 0) {
            return 0;
        }
        return Math.min(score, 100);
    }
}
