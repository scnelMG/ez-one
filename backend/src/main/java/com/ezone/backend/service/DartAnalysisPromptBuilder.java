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
            The first priority is practical essay material, not completeness of disclosure coverage.

            Required analysis:
            1. Split the analysis into exactly three sections:
               - mainProductsAndServices: products, services, business model, customer value, market direction.
               - contractsAndRAndD: major contracts, partnerships, R&D, technology, production, investment, new business.
               - otherNotes: risks, regulations, ESG, organization, global expansion, financial or operational notes that may matter for an essay.
            2. For each section, write:
               - coreSummary: at most 2 Korean sentences. Explain why this fact is useful for the applicant's essay.
               - evidencePoints: 0 to 3 short facts only. Each fact must be grounded in the DART report and useful for the given JD/position.
               - jobFitPoints: 0 to 3 bullets connecting the DART fact to the user's JD and position. Avoid generic statements.
               - resumeUsePoints: 0 to 2 use cases only. The useCase must be one of 지원동기, 직무역량, 입사 후 포부, 성장경험, 기타.
               - sentenceCandidates: 1 to 2 polished Korean essay-ready sentences. They must sound like an applicant's sentence, not a report summary.
               - cautionPoints: 1 to 2 warnings about how not to overuse this fact.
               - rawText: one short source note, maximum 120 Korean characters.
            3. Avoid duplicate content across the three sections.
               If a fact fits multiple sections, put it only in the most useful section.
            4. Strictly filter out accounting-only material.
               Do not select impairment tests, recoverable amount valuation, contract assets/liabilities, revenue recognition policy,
               lease accounting, audit opinions, financial statement notes, or generic accounting controls unless the user's JD explicitly requires accounting, audit, risk, finance, or IR work.
               For service planning, product planning, marketing, design, data, engineering, or business roles, these accounting facts are usually not useful essay evidence.
            5. Prioritize JD relevance in this order:
               a. Facts about actual products/services, customers, channels, markets, technology, R&D, production, partnerships, overseas expansion, or new business.
               b. Facts that can support the user's target position duties and required competencies inferred from the JD context.
               c. Facts that can become a sentence in 지원동기, 직무역량, or 입사 후 포부.
               d. Financial numbers only if they directly explain product scale, market focus, R&D investment, or business priority for the user's role.
            6. If a section has no useful fact in this report, return an empty section:
               coreSummary="", evidencePoints=[], jobFitPoints=[], resumeUsePoints=[], sentenceCandidates=[], cautionPoints=["이 보고서에서 해당 항목의 자소서 활용 근거가 충분하지 않습니다."], rawText="".
               Do not force weak facts into a section.
            7. Evidence wording rules:
               - Start each evidencePoint with a concrete DART fact, then add why it matters for the JD in one short clause.
               - Include the source section name and receipt number inside the evidence text when possible.
               - Do not use vague phrases like "도움이 될 수 있음" without saying exactly which JD competency it supports.
            8. Sentence candidates must be applicant-facing:
               They should show how the applicant will use their experience for the company's product/service direction.
               Avoid sentences that merely praise the company.
            9. Also keep backward-compatible evidenceCards, appealPoints, suggestedSentences, cautions, and missingInfo.
               Keep these concise and non-duplicative.
            10. Do not invent facts. If the report does not contain a useful fact, put it in missingInfo or cautionPoints.
            11. Every evidence card must be grounded in the selected receipt number.
            12. Return Korean. Use compact bullet-style wording, not long paragraphs.

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
