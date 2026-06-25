package com.ezone.backend.service;

import java.util.List;
import org.springframework.util.StringUtils;

final class DartAnalysisPromptBuilder {

    private DartAnalysisPromptBuilder() {
    }

    static String build(DartAiAnalysisRequest request) {
        return """
            접수번호: %s
            보고서명: %s
            회사명: %s
            지원 직무: %s
            자기소개서 문항 및 JD 문맥: %s

            목표:
            한국어 자기소개서에 가장 유용한 DART 근거만 선별합니다.
            이 작업은 재무 요약이나 회사 소개가 아닙니다.
            결과는 지원자가 해당 직무의 지원동기, 직무역량, 입사 후 포부 문항을 작성하는 데 도움을 줘야 합니다.

            필수 분석:
            1. 분석 결과는 정확히 세 섹션으로 나눕니다.
               - mainProductsAndServices: 제품, 서비스, 비즈니스 모델, 고객 가치, 시장 방향.
               - contractsAndRAndD: 주요 계약, 파트너십, R&D, 기술, 생산, 투자, 신사업.
               - otherNotes: 자기소개서에 의미가 있을 수 있는 리스크, 규제, ESG, 조직, 글로벌 확장, 재무/운영 참고사항.
            2. 각 섹션에는 다음 항목을 작성합니다.
               - coreSummary: 최대 2개의 한국어 문장. 해당 사실이 자기소개서에 왜 유용한지 설명합니다.
               - evidencePoints: 1~3개의 짧은 사실. 각 사실은 DART 보고서에 근거해야 하며 JD/직무에 유용해야 합니다.
               - jobFitPoints: DART 사실을 사용자의 JD와 지원 직무에 연결하는 1~3개 bullet. 일반론은 피합니다.
               - resumeUsePoints: 1~2개 활용 사례. useCase는 지원동기, 직무역량, 입사 후 포부, 성장경험, 기타 중 하나입니다.
               - sentenceCandidates: 자기소개서에 바로 다듬어 쓸 수 있는 한국어 문장 1~2개. 보고서 요약이 아니라 지원자의 문장처럼 씁니다.
               - cautionPoints: 해당 사실을 과하게 사용하지 않기 위한 주의점 1~2개.
               - rawText: 최대 120자의 짧은 출처 메모 1개.
            3. 세 섹션 간 중복 내용을 피합니다.
               여러 섹션에 들어갈 수 있는 사실은 가장 유용한 섹션 하나에만 넣습니다.
            4. 재무 수치를 과도하게 사용하지 않습니다.
               숫자는 제공된 JD의 자기소개서 포인트를 직접 뒷받침할 때만 포함합니다.
               매출 표, 계약자산/부채, 회계 세부사항은 사용자 직무에 명확히 유용할 때만 씁니다.
            5. JD 관련성을 우선합니다.
               제공된 JD 문맥에서 필요한 역량을 먼저 추론한 뒤, 그 역량을 뒷받침할 DART 사실을 고릅니다.
            6. 하위 호환을 위해 evidenceCards, appealPoints, suggestedSentences, cautions, missingInfo도 유지합니다.
               이 항목들은 간결하고 중복 없이 작성합니다.
            7. 사실을 지어내지 않습니다. 보고서에 유용한 사실이 없으면 missingInfo 또는 cautionPoints에 씁니다.
            8. 모든 evidence card는 선택된 접수번호에 근거해야 합니다.
            9. 한국어로 반환합니다. 긴 문단이 아니라 간결한 개조식 표현을 사용합니다.

            DART 보고서 텍스트:
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
