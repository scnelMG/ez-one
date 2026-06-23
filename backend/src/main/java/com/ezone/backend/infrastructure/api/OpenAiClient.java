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
    private static final String DEFAULT_BASE_URL = "https://gms.ssafy.io/gmsapi/api.openai.com/v1";
    private static final String DEFAULT_COMPARE_MODEL = "gpt-4.1-mini";

    private final RestTemplate restTemplate;
    private final String baseUrl;
    private final String apiKey;
    private final String compareModel;

    public OpenAiClient(
            RestTemplate restTemplate,
            @Value("${gms.ai.base-url:" + DEFAULT_BASE_URL + "}") String baseUrl,
            @Value("${gms.ai.api-key:}") String apiKey,
            @Value("${dart.ai.compare-model:" + DEFAULT_COMPARE_MODEL + "}") String compareModel) {
        this.restTemplate = restTemplate;
        this.baseUrl = trimTrailingSlash(StringUtils.hasText(baseUrl) ? baseUrl : DEFAULT_BASE_URL);
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.compareModel = normalizeCompareModel(compareModel);
    }

    public String generateComparisonSummary(
        String leftBody,
        String rightBody,
        String companyName,
        String positionTitle,
        String jdContext
    ) {
        if (!StringUtils.hasText(apiKey)) {
            log.warn("GMS API key is missing. Skipping AI comparison summary.");
            return null;
        }

        String prompt = """
            당신은 한국 채용 자기소개서를 첨삭하는 시니어 커리어 컨설턴트입니다.
            사용자가 저장한 자기소개서의 이전 버전과 비교 버전을 비교하고, 지원 기업/직무/JD에 맞춘 피드백을 작성하세요.

            출력 규칙:
            - 반드시 한국어로 작성합니다.
            - 문단형 긴 설명이 아니라 개조식 bullet로 작성합니다.
            - 두 섹션만 작성합니다.
              1. 변경된 내용
              2. 합격 가능성을 높이는 AI 피드백
            - "변경된 내용"에는 실제로 추가/삭제/강조가 달라진 사실만 씁니다.
            - "합격 가능성을 높이는 AI 피드백"에는 지원 기업, 지원 직무, JD를 기준으로 서류 합격 가능성을 높이는 보완점을 씁니다.
            - 근거 없는 경험이나 성과를 지어내지 말고, 사용자가 쓴 내용 안에서 강화할 방향을 제안합니다.
            - 가능하면 직무 키워드, JD 요구사항, 성과 구체화, 기업 적합성 관점으로 피드백합니다.
            - 각 섹션은 3~5개 bullet 이내로 간결하게 작성합니다.

            === 지원 정보 ===
            기업: %s
            직무: %s

            === 사용자가 입력한 JD 참고자료 ===
            %s

            === 이전 버전 ===
            %s

            === 비교 버전 ===
            %s
            """.formatted(
                fallback(companyName, "미입력"),
                fallback(positionTitle, "미입력"),
                fallback(jdContext, "사용자가 입력한 JD 참고자료가 없습니다. 기업명과 직무명, 자기소개서 본문만 기준으로 피드백하세요."),
                fallback(leftBody, ""),
                fallback(rightBody, "")
            );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        Map<String, Object> requestBody = Map.of(
            "model", compareModel,
            "input", List.of(
                Map.of("role", "system", "content", "You are a precise Korean career coach who compares essay versions using company, role, and JD context."),
                Map.of("role", "user", "content", prompt)
            ),
            "temperature", 0.35,
            "max_output_tokens", 800
        );

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

        try {
            String url = baseUrl + "/responses";
            Map response = restTemplate.postForObject(url, request, Map.class);
            String outputText = extractOutputText(response);
            if (StringUtils.hasText(outputText)) {
                return outputText.trim();
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

    private String trimTrailingSlash(String value) {
        String trimmed = value.trim();
        while (trimmed.endsWith("/")) {
            trimmed = trimmed.substring(0, trimmed.length() - 1);
        }
        return trimmed;
    }
}
