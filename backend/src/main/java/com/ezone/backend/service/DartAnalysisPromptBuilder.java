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
            Turn DART disclosure facts into compact, usable Korean job-application essay material.
            This is an integrated DART-to-essay analysis. Do not produce a raw DART summary and do not write a generic company introduction.
            Read the user's saved JD context, target company, target position, and essay questions first.
            Select only facts that can help the applicant write 지원동기, 직무역량, 입사 후 포부, or related answers for the target position.

            Required analysis:
            1. Split the analysis into exactly three sections:
               - mainProductsAndServices: actual products, services, business model, channels, customer value, product line, market direction.
               - contractsAndRAndD: major contracts, partnerships, R&D, technology, production capability, investment, new business.
               - otherNotes: risks, regulations, ESG, organization, global expansion, operational notes, or cautions that may matter for an essay.
            2. For each section, write:
               - coreSummary: 1 to 2 Korean sentences. Summarize the selected DART facts and why they are useful for this JD.
               - evidencePoints: 1 to 3 concrete DART facts only, unless no useful facts exist. Each item must include source section and receipt number.
               - jobFitPoints: 1 to 3 bullets that directly connect the evidence to the saved JD duties/competencies and target position.
               - resumeUsePoints: 1 to 2 actionable use cases. The useCase must be one of 지원동기, 직무역량, 입사 후 포부, 성장경험, 기타.
                 The recommendation must explain where in the essay to use the fact and how to connect it to the applicant's experience.
               - sentenceCandidates: 1 to 2 polished Korean essay-ready sentences. They must be grounded in DART and sound like an applicant's sentence.
               - cautionPoints: 1 to 2 warnings about overclaiming, unsupported interpretation, or weak use.
               - rawText: one short source note, maximum 120 Korean characters, formatted as "근거: source section · receipt number".
            3. Avoid duplicate content across the three sections.
               If a fact fits multiple sections, put it only in the most useful section.
            4. Strict accounting filter:
               Do not select impairment tests, recoverable amount valuation, contract assets/liabilities, revenue recognition policy,
               lease accounting, audit opinions, internal accounting control, financial statement notes, or generic accounting controls
               unless the saved JD or target position explicitly requires accounting, audit, risk, finance, IR, compliance, or internal control work.
               For service planning, product planning, marketing, design, data, engineering, HR, or business planning roles, these accounting facts are usually noise.
               If only accounting-only facts are available for a section, return that section as empty so the caller can try an older report.
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
            13. The final UI will show "주요 제품 및 서비스", "주요 계약 및 연구 개발 활동", and "기타 참고사항".
                Make each section immediately useful to a job seeker: 핵심 근거 + JD 맞춤 연결 + 자소서 활용방안.

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
