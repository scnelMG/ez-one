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

    public String generateComparisonSummary(String leftBody, String rightBody, String customPrompt) {
        if (!StringUtils.hasText(apiKey)) {
            log.warn("GMS API key is missing. Skipping AI comparison summary.");
            return null;
        }

        String basePrompt = (customPrompt != null && !customPrompt.isBlank())
            ? customPrompt
            : "You are an expert career consultant. The user has revised their self-introduction essay. " +
              "I will provide the previous version (버전 1) and the revised version (버전 2).\n" +
              "Please analyze the differences and write a brief summary (3~5 sentences in Korean) of what has improved or changed. " +
              "Focus on the flow, specific additions or deletions, and how it aligns with typical essay improvements.";

        String prompt = basePrompt + "\n\n" +
                "=== 이전 버전 (버전 1) ===\n" + leftBody + "\n\n" +
                "=== 비교 버전 (버전 2) ===\n" + rightBody;

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        Map<String, Object> requestBody = Map.of(
            "model", compareModel,
            "input", List.of(
                Map.of("role", "system", "content", "You are a helpful assistant for Korean job applicants."),
                Map.of("role", "user", "content", prompt)
            ),
            "temperature", 0.7,
            "max_output_tokens", 500
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

    private String trimTrailingSlash(String value) {
        String trimmed = value.trim();
        while (trimmed.endsWith("/")) {
            trimmed = trimmed.substring(0, trimmed.length() - 1);
        }
        return trimmed;
    }
}
