package com.ezone.backend.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;

class DartAnalysisPromptBuilderTest {

    @Test
    void promptRequiresStructuredCollectionOrganizationAnalysisAndAdvice() {
        String prompt = DartAnalysisPromptBuilder.build(new DartAiAnalysisRequest(
            "20260330000123",
            "사업보고서",
            "Naver",
            "Backend Engineer",
            List.of("지원동기를 작성하세요."),
            "DART report text"
        ));

        assertThat(prompt)
            .contains("collect", "organize", "analyze", "advice")
            .contains("Do not expose raw DART facts item-by-item")
            .contains("Actionable advice");
    }
}
