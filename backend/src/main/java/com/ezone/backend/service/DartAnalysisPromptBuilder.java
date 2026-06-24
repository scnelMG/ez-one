package com.ezone.backend.service;

import java.util.List;
import org.springframework.util.StringUtils;

final class DartAnalysisPromptBuilder {

    private DartAnalysisPromptBuilder() {
    }

    static String build(DartAiAnalysisRequest request) {
        return """
            Receipt number: %s
            Report name: %s
            Company: %s
            Position: %s
            Essay questions and JD context: %s

            Goal:
            Select only the most useful DART facts for a Korean job application essay.
            This is not a financial summary. This is not a company introduction.
            The output must help the applicant write motivation, competency, or aspiration answers for the given position.

            Required analysis:
            1. Split the analysis into exactly three sections:
               - mainProductsAndServices: products, services, business model, customer value, market direction.
               - contractsAndRAndD: major contracts, partnerships, R&D, technology, production, investment, new business.
               - otherNotes: risks, regulations, ESG, organization, global expansion, financial or operational notes that may matter for an essay.
            2. For each section, write:
               - coreSummary: at most 2 Korean sentences. Explain why this fact is useful for the applicant's essay.
               - evidencePoints: 1 to 3 short facts only. Each fact must be grounded in the DART report and useful for the given JD/position.
               - jobFitPoints: 1 to 3 bullets connecting the DART fact to the user's JD and position. Avoid generic statements.
               - resumeUsePoints: 1 to 2 use cases only. The useCase must be one of 지원동기, 직무역량, 입사 후 포부, 성장경험, 기타.
               - sentenceCandidates: 1 to 2 polished Korean essay-ready sentences. They must sound like an applicant's sentence, not a report summary.
               - cautionPoints: 1 to 2 warnings about how not to overuse this fact.
               - rawText: one short source note, maximum 120 Korean characters.
            3. Avoid duplicate content across the three sections.
               If a fact fits multiple sections, put it only in the most useful section.
            4. Do not overuse financial figures.
               Include a number only when it directly supports an essay point for the provided JD.
               Never list revenue tables, contract assets/liabilities, or accounting details unless they are clearly useful for the user's role.
            5. Prioritize JD relevance:
               First infer the competencies needed from the provided JD context, then select DART facts that can support those competencies.
            6. Also keep backward-compatible evidenceCards, appealPoints, suggestedSentences, cautions, and missingInfo.
               Keep these concise and non-duplicative.
            7. Do not invent facts. If the report does not contain a useful fact, put it in missingInfo or cautionPoints.
            8. Every evidence card must be grounded in the selected receipt number.
            9. Return Korean. Use compact bullet-style wording, not long paragraphs.

            DART report text:
            %s
            """.formatted(
            defaultText(request.rceptNo()),
            defaultText(request.reportName()),
            defaultText(request.companyName()),
            defaultText(request.positionTitle()),
            request.essayQuestions() == null ? List.of() : request.essayQuestions(),
            defaultText(request.documentText())
        );
    }

    private static String defaultText(String value) {
        return StringUtils.hasText(value) ? value : "";
    }
}
