package com.ezone.backend.service;

import com.ezone.backend.domain.persistence.MattermostParsedJobPostRow;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

@Service
public class GmsAiJobRecommendationClient implements AiJobRecommendationClient {

    private static final Logger log = LoggerFactory.getLogger(GmsAiJobRecommendationClient.class);
    private static final String DEFAULT_BASE_URL = "https://gms.ssafy.io/gmsapi/api.openai.com/v1";

    private final RestTemplate restTemplate;
    private final String apiKey;
    private final String baseUrl;
    private final String model;

    public GmsAiJobRecommendationClient(
        RestTemplate restTemplate,
        @Value("${gms.ai.api-key:}") String apiKey,
        @Value("${gms.ai.base-url:" + DEFAULT_BASE_URL + "}") String baseUrl,
        @Value("${gms.ai.recommendation-model:gpt-4.1-mini}") String model
    ) {
        this.restTemplate = restTemplate;
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.baseUrl = trimTrailingSlash(baseUrl == null || baseUrl.isBlank() ? DEFAULT_BASE_URL : baseUrl);
        this.model = model == null || model.isBlank() ? "gpt-4.1-mini" : model.trim();
    }

    @Override
    public Optional<AiRecommendationSignal> recommend(MattermostParsedJobPostRow row) {
        if (apiKey.isBlank()) {
            return Optional.empty();
        }
        try {
            Map<String, Object> response = restTemplate.postForObject(
                baseUrl + "/responses",
                new HttpEntity<>(requestBody(row), headers()),
                Map.class
            );
            return extractText(response).flatMap(this::parseSignal);
        } catch (RestClientException | IllegalArgumentException exception) {
            log.warn("GMS recommendation failed for Mattermost candidate {}: {}", row.getId(), exception.getMessage());
            return Optional.empty();
        }
    }

    private HttpHeaders headers() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);
        return headers;
    }

    private Map<String, Object> requestBody(MattermostParsedJobPostRow row) {
        String prompt = """
            SSAFY 교육생에게 Mattermost 채용공고를 추천할지 평가해 주세요.
            반드시 JSON만 반환하세요. 형식: {"score":0-100,"reason":"한국어 한 문장"}
            기준: 개발/데이터/보안/인프라/AI 직무 적합도, 마감 임박도, 회사/공고 신뢰도.

            회사명: %s
            직무/공고명: %s
            마감: %s
            공고 URL: %s
            """.formatted(
            safe(row.getCompanyName()),
            safe(row.getTitle()),
            safe(row.getDeadlineLabel()),
            safe(row.getUrl())
        );
        return Map.of(
            "model", model,
            "input", prompt,
            "temperature", 0.2,
            "max_output_tokens", 160
        );
    }

    private Optional<String> extractText(Map<String, Object> response) {
        if (response == null || response.isEmpty()) {
            return Optional.empty();
        }
        Object outputText = response.get("output_text");
        if (outputText instanceof String text && !text.isBlank()) {
            return Optional.of(text);
        }
        Object output = response.get("output");
        if (!(output instanceof List<?> outputItems)) {
            return Optional.empty();
        }
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
                    if (text instanceof String value && !value.isBlank()) {
                        return Optional.of(value);
                    }
                }
            }
        }
        return Optional.empty();
    }

    private Optional<AiRecommendationSignal> parseSignal(String text) {
        String json = unwrapJson(text);
        int scoreIndex = json.indexOf("\"score\"");
        int reasonIndex = json.indexOf("\"reason\"");
        if (scoreIndex < 0 || reasonIndex < 0) {
            return Optional.empty();
        }
        int score = parseScore(json.substring(scoreIndex));
        String reason = parseReason(json.substring(reasonIndex));
        if (reason.isBlank()) {
            return Optional.empty();
        }
        return Optional.of(new AiRecommendationSignal(Math.max(0, Math.min(score, 100)), reason));
    }

    private int parseScore(String text) {
        String digits = text.replaceFirst("(?s).*?:\\s*([0-9]{1,3}).*", "$1");
        if (digits.equals(text)) {
            return 0;
        }
        return Integer.parseInt(digits);
    }

    private String parseReason(String text) {
        return text.replaceFirst("(?s).*?:\\s*\"([^\"]+)\".*", "$1").trim();
    }

    private String unwrapJson(String text) {
        String trimmed = text.trim();
        if (trimmed.startsWith("```")) {
            trimmed = trimmed.replaceFirst("^```(?:json)?\\s*", "");
            trimmed = trimmed.replaceFirst("\\s*```$", "");
        }
        int start = trimmed.indexOf('{');
        int end = trimmed.lastIndexOf('}');
        return start >= 0 && end > start ? trimmed.substring(start, end + 1) : trimmed;
    }

    private String trimTrailingSlash(String value) {
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }
}
