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

        if (evidenceCards.isEmpty()) {
            missingInfo.add("No source-grounded DART evidence card passed the quality gate.");
            notes.add("quality gate: no valid evidence card");
        }
        if (!notes.isEmpty()) {
            cautions.add("AI quality gate adjusted the analysis. Review source sections before using this in an essay.");
        }

        int score = score(evidenceCards, appealPoints, suggestedSentences, notes);
        DartAnalysisContentResponse improved = new DartAnalysisContentResponse(
            evidenceCards,
            appealPoints,
            suggestedSentences,
            nonBlankDistinct(cautions),
            nonBlankDistinct(missingInfo)
        );
        return new DartAnalysisEvaluation(!evidenceCards.isEmpty(), score, improved, List.copyOf(notes));
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
            cleaned.add(value.trim());
        }
        return nonBlankDistinct(cleaned);
    }

    private int score(
        List<DartAnalysisContentResponse.EvidenceCard> evidenceCards,
        List<String> appealPoints,
        List<String> suggestedSentences,
        List<String> notes
    ) {
        int score = 0;
        if (!evidenceCards.isEmpty()) {
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

    private int clampScore(int score) {
        if (score < 0) {
            return 0;
        }
        return Math.min(score, 100);
    }
}
