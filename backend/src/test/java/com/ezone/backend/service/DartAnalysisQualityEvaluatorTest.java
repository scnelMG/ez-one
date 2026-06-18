package com.ezone.backend.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.ezone.backend.dto.dart.DartAnalysisContentResponse;
import java.util.List;
import org.junit.jupiter.api.Test;

class DartAnalysisQualityEvaluatorTest {

    private final DartAnalysisQualityEvaluator evaluator = new DartAnalysisQualityEvaluator();

    @Test
    void evaluationRemovesUngroundedAndPolicyRiskyOutputBeforeUserReview() {
        DartAnalysisEvaluation evaluation = evaluator.evaluate(new DartAnalysisContentResponse(
            List.of(
                new DartAnalysisContentResponse.EvidenceCard(
                    "AI platform",
                    "The report describes AI platform investment.",
                    "Business overview",
                    "20260330000123",
                    120
                ),
                new DartAnalysisContentResponse.EvidenceCard(
                    "Wrong report",
                    "This came from another receipt.",
                    "Business overview",
                    "20240101000999",
                    80
                ),
                new DartAnalysisContentResponse.EvidenceCard(
                    "Stock outlook",
                    "The stock price will rise.",
                    "Investment opinion",
                    "20260330000123",
                    90
                )
            ),
            List.of("Connect platform investment to backend reliability.", "The hiring probability is high."),
            List.of("I can contribute to reliable AI platforms.", "This improves the target stock price."),
            List.of(),
            List.of()
        ), "20260330000123");

        assertThat(evaluation.passed()).isTrue();
        assertThat(evaluation.score()).isGreaterThanOrEqualTo(80);
        assertThat(evaluation.content().evidenceCards()).hasSize(1);
        assertThat(evaluation.content().evidenceCards().get(0).relevanceScore()).isEqualTo(100);
        assertThat(evaluation.content().suggestedSentences())
            .containsExactly("I can contribute to reliable AI platforms.");
        assertThat(evaluation.content().appealPoints())
            .containsExactly("Connect platform investment to backend reliability.");
        assertThat(evaluation.content().cautions())
            .anyMatch((item) -> item.contains("quality gate"));
    }

    @Test
    void evaluationFailsWhenNoSourceGroundedEvidenceRemains() {
        DartAnalysisEvaluation evaluation = evaluator.evaluate(new DartAnalysisContentResponse(
            List.of(new DartAnalysisContentResponse.EvidenceCard(
                "Unsupported",
                "No matching source.",
                "",
                "20240101000999",
                70
            )),
            List.of(),
            List.of(),
            List.of(),
            List.of()
        ), "20260330000123");

        assertThat(evaluation.passed()).isFalse();
        assertThat(evaluation.content().evidenceCards()).isEmpty();
        assertThat(evaluation.content().missingInfo())
            .contains("No source-grounded DART evidence card passed the quality gate.");
    }
}
