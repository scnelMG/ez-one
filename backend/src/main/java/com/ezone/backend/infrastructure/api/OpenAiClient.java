package com.ezone.backend.infrastructure.api;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Component
public class OpenAiClient {

    private static final Logger log = LoggerFactory.getLogger(OpenAiClient.class);
    private static final String DEFAULT_COMPARE_MODEL = "gpt-4.1-mini";

    private final RestTemplate restTemplate;
    private final String baseUrl;
    private final String apiKey;
    private final String compareModel;

    public OpenAiClient(
            RestTemplate restTemplate,
            @Value("${gms.ai.base-url}") String baseUrl,
            @Value("${gms.ai.api-key:}") String apiKey,
            @Value("${dart.ai.compare-model:" + DEFAULT_COMPARE_MODEL + "}") String compareModel) {
        this.restTemplate = restTemplate;
        this.baseUrl = trimTrailingSlash(StringUtils.hasText(baseUrl) ? baseUrl : "");
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.compareModel = normalizeCompareModel(compareModel);
    }

    public String generateComparisonSummary(
        String leftBody,
        String rightBody,
        String leftVersionName,
        String rightVersionName,
        String questionPrompt,
        String companyName,
        String positionTitle,
        String jdContext
    ) {
        if (!StringUtils.hasText(apiKey)) {
            log.warn("GMS API key is missing. Skipping AI comparison summary.");
            return null;
        }

        String leftName = fallback(leftVersionName, "이전 저장본");
        String rightName = fallback(rightVersionName, "비교 저장본");

        String prompt = """
            당신은 한국 대기업/중견기업 서류 전형을 많이 검토해 본 채용담당자이자 자기소개서 첨삭 전문가입니다.
            사용자가 저장한 두 자기소개서 버전을 비교하고, 지원 기업/직무/JD/작성 문항을 논리적으로 함께 고려해 피드백하세요.
            비교 대상의 실제 제목은 "%s"와 "%s"입니다.

            출력 규칙:
            - 반드시 한국어로 작성합니다.
            - 문단형 긴 설명은 절대 금지합니다. 모든 설명은 반드시 개조식 bullet로만 작성합니다.
            - "버전 1", "버전 2", "이전 버전", "비교 버전", "첫 번째 버전", "두 번째 버전"이라는 표현은 금지합니다.
            - 비교 대상을 지칭할 때는 반드시 실제 제목 "%s", "%s"만 사용합니다.
            - 아래 출력 템플릿을 그대로 따릅니다. 섹션 제목을 생략하거나 한 문단으로 합치면 안 됩니다.
              1. 변경된 사실
              - ...
              - ...
              - ...

              2. 채용담당자 관점 피드백
              - ...
              - ...
              - ...
            - "변경된 사실"에는 "%s"에서 "%s"로 바뀌며 실제로 추가/삭제/강조/구조/표현이 달라진 사실만 씁니다.
            - "변경된 사실"에서는 평가하거나 조언하지 말고, 두 본문에서 확인 가능한 변화만 근거 중심으로 씁니다.
            - "채용담당자 관점 피드백"에는 지원 기업, 지원 직무, JD, 작성 문항에 비추어 채용담당자가 읽었을 때 합격 가능성을 높이는 보완점을 씁니다.
            - 지원 직무/JD/작성 문항과 무관한 일반론은 쓰지 않습니다.
            - 근거 없는 경험이나 성과를 지어내지 말고, 사용자가 쓴 내용 안에서 강화할 방향을 제안합니다.
            - 직무 적합성, JD 요구역량, 문항 의도, 기업/직무 연결성, 경험의 구체성, 성과/수치/행동의 선명도를 기준으로 평가합니다.
            - 사용자가 지원하는 직무와 JD에서 중요한 키워드가 자기소개서에 어떻게 반영됐는지 반드시 언급합니다.
            - "채용담당자 관점 피드백"의 각 bullet은 반드시 다음 구조를 포함합니다: 채용담당자가 읽는 해석 → 부족하거나 위험한 지점 → 사용자가 바로 고칠 수정 액션.
            - 가능하면 "이 표현은 유지", "이 부분은 보강", "이 문장은 줄이기", "JD 키워드와 연결"처럼 사용자가 자소서 수정에 바로 쓸 수 있는 지시형 피드백으로 씁니다.
            - 각 섹션은 5~7개 bullet로 작성합니다. 너무 짧게 요약하지 말고, 각 bullet은 2문장 안팎으로 구체적으로 씁니다.
            - "변경된 사실" bullet에는 무엇이 바뀌었는지와 해당 변화가 어떤 근거 문장/표현에서 확인되는지 씁니다.
            - "채용담당자 관점 피드백" bullet에는 왜 중요한지와 어떻게 보완할지를 씁니다.
            - 각 bullet은 "- "로 시작합니다.
            - 전체 답변에는 "1. 변경된 사실", "2. 채용담당자 관점 피드백", 그리고 "- "로 시작하는 bullet만 포함합니다. 서론/결론 문장은 쓰지 않습니다.
            - 최종 답변이 한 문단으로 보이면 실패입니다. 반드시 줄바꿈이 있는 목록 형태로 작성합니다.

            === 지원 정보 ===
            기업: %s
            직무: %s
            작성 문항: %s

            === 사용자가 입력한 JD 참고자료 ===
            %s

            === %s ===
            %s

            === %s ===
            %s
            """.formatted(
                leftName,
                rightName,
                leftName,
                rightName,
                leftName,
                rightName,
                fallback(companyName, "미입력"),
                fallback(positionTitle, "미입력"),
                fallback(questionPrompt, "문항 정보가 없습니다."),
                fallback(jdContext, "사용자가 입력한 JD 참고자료가 없습니다. 기업명과 직무명, 자기소개서 본문만 기준으로 피드백하세요."),
                leftName,
                fallback(leftBody, ""),
                rightName,
                fallback(rightBody, "")
            );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        Map<String, Object> requestBody = Map.of(
            "model", compareModel,
            "input", List.of(
                Map.of("role", "system", "content", "당신은 정확한 한국어 채용담당자이자 커리어 코치입니다. 실제 버전명, 회사, 직무, JD, 문항 의도를 기준으로 자기소개서 버전을 비교하세요. 답변은 변경된 사실과 채용담당자 관점 피드백을 분리한 상세한 한국어 bullet로만 작성합니다."),
                Map.of("role", "user", "content", prompt)
            ),
            "temperature", 0.35,
            "max_output_tokens", 1400
        );

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

        try {
            String url = baseUrl + "/responses";
            Map response = restTemplate.postForObject(url, request, Map.class);
            String outputText = extractOutputText(response);
            if (StringUtils.hasText(outputText)) {
                return normalizeComparisonSummary(outputText, leftName, rightName);
            }
        } catch (Exception e) {
            log.error("Failed to generate AI comparison summary", e);
        }
        return null;
    }

    private String extractOutputText(Map response) {
        if (response == null || response.isEmpty()) {
            return "";
        }
        Object outputText = response.get("output_text");
        if (outputText instanceof String text) {
            return text;
        }
        Object output = response.get("output");
        if (!(output instanceof List<?> outputItems)) {
            return "";
        }
        StringBuilder builder = new StringBuilder();
        for (Object outputItem : outputItems) {
            if (!(outputItem instanceof Map<?, ?> outputMap)) {
                continue;
            }
            Object content = outputMap.get("content");
            if (!(content instanceof List<?> contentItems)) {
                continue;
            }
            for (Object contentItem : contentItems) {
                if (contentItem instanceof Map<?, ?> contentMap) {
                    Object text = contentMap.get("text");
                    if (text instanceof String value) {
                        builder.append(value);
                    }
                }
            }
        }
        return builder.toString();
    }

    private String normalizeCompareModel(String model) {
        if (!StringUtils.hasText(model)) {
            return DEFAULT_COMPARE_MODEL;
        }
        String trimmed = model.trim();
        if (trimmed.toLowerCase().startsWith("gemini")) {
            log.warn("DART AI compare model '{}' is not OpenAI responses-compatible. Falling back to {}.", trimmed, DEFAULT_COMPARE_MODEL);
            return DEFAULT_COMPARE_MODEL;
        }
        return trimmed;
    }

    private String fallback(String value, String fallback) {
        return StringUtils.hasText(value) ? value.trim() : fallback;
    }

    private String normalizeComparisonSummary(String summary, String leftName, String rightName) {
        if (!StringUtils.hasText(summary)) {
            return "";
        }
        String normalized = summary.trim()
            .replaceAll("(?i)version\\s*1", leftName)
            .replaceAll("(?i)version\\s*2", rightName)
            .replaceAll("버전\\s*1", leftName)
            .replaceAll("버전\\s*2", rightName)
            .replaceAll("1번\\s*버전", leftName)
            .replaceAll("2번\\s*버전", rightName)
            .replace("첫 번째 버전", leftName)
            .replace("두 번째 버전", rightName)
            .replace("첫번째 버전", leftName)
            .replace("두번째 버전", rightName)
            .replace("이전 버전", leftName)
            .replace("비교 버전", rightName);
        return enforceBulletSummaryFormat(normalized);
    }

    private String enforceBulletSummaryFormat(String summary) {
        boolean hasFactSection = summary.contains("1. 변경된 사실");
        boolean hasFeedbackSection = summary.contains("2. 채용담당자 관점 피드백");
        boolean hasBullets = summary.lines().anyMatch(line -> line.trim().startsWith("- "));
        if (hasFactSection && hasFeedbackSection && hasBullets) {
            return summary;
        }

        List<String> sentences = splitKoreanSentences(summary);
        if (sentences.isEmpty()) {
            return summary;
        }

        int splitIndex = Math.max(1, (int) Math.ceil(sentences.size() / 2.0));
        List<String> facts = sentences.subList(0, splitIndex);
        List<String> feedback = sentences.subList(splitIndex, sentences.size());
        if (feedback.isEmpty()) {
            feedback = List.of("지원 기업, 직무, JD, 작성 문항과 연결되는 역량 표현을 더 구체화하면 채용담당자가 지원 적합성을 판단하기 쉬워집니다.");
        }

        StringBuilder builder = new StringBuilder();
        builder.append("1. 변경된 사실\n");
        for (String sentence : facts) {
            builder.append("- ").append(sentence).append("\n");
        }
        builder.append("\n2. 채용담당자 관점 피드백\n");
        for (String sentence : feedback) {
            builder.append("- ").append(sentence).append("\n");
        }
        return builder.toString().trim();
    }

    private List<String> splitKoreanSentences(String text) {
        String decimalProtected = text
            .replace("\r\n", "\n")
            .replaceAll("(\\d)\\.(\\d)", "$1<decimal>$2");
        return List.of(decimalProtected.split("(?<=[.!?。！？]|[다요죠니다])\\s+"))
            .stream()
            .map(line -> line.replace("<decimal>", "."))
            .map(line -> line.replaceAll("^[-•]\\s*", "").trim())
            .filter(StringUtils::hasText)
            .toList();
    }

    private String trimTrailingSlash(String value) {
        String trimmed = value.trim();
        while (trimmed.endsWith("/")) {
            trimmed = trimmed.substring(0, trimmed.length() - 1);
        }
        return trimmed;
    }
}
