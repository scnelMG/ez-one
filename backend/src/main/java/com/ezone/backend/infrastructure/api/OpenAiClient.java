package com.ezone.backend.infrastructure.api;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Component
public class OpenAiClient {

    private static final Logger log = LoggerFactory.getLogger(OpenAiClient.class);

    private final RestTemplate restTemplate;
    private final String baseUrl;
    private final String apiKey;
    private final String compareModel;

    public OpenAiClient(
            RestTemplate restTemplate,
            @Value("${GMS_AI_BASE_URL:https://api.openai.com/v1}") String baseUrl,
            @Value("${GMS_API_KEY:}") String apiKey,
            @Value("${DART_AI_COMPARE_MODEL:gpt-4o-mini}") String compareModel) {
        this.restTemplate = restTemplate;
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
        this.compareModel = compareModel;
    }

    public String generateComparisonSummary(String leftBody, String rightBody, String customPrompt) {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("OpenAI API Key is missing. Skipping AI comparison summary.");
            return null;
        }

        String basePrompt = (customPrompt != null && !customPrompt.isBlank())
            ? customPrompt
            : "당신은 한국어 자기소개서 첨삭 컨설턴트입니다. " +
              "이전 버전과 수정 버전을 비교해 사용자가 바로 이해할 수 있게 요약하세요.\n" +
              "출력은 한국어로 3개 이하의 짧은 bullet로 작성하고, 좋아진 점과 추가로 확인할 점을 구분하세요. " +
              "없는 내용은 추측하지 말고, 실제 변경된 표현과 구조만 근거로 설명하세요.";

        String prompt = basePrompt + "\n\n" +
                "=== 이전 버전 ===\n" + leftBody + "\n\n" +
                "=== 수정 버전 ===\n" + rightBody;

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        Map<String, Object> requestBody = Map.of(
            "model", compareModel,
            "messages", List.of(
                Map.of("role", "system", "content", "You are a helpful assistant for Korean job applicants."),
                Map.of("role", "user", "content", prompt)
            ),
            "temperature", 0.3,
            "max_tokens", 350
        );

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

        try {
            String url = baseUrl + "/chat/completions";
            Map response = restTemplate.postForObject(url, request, Map.class);
            if (response != null && response.containsKey("choices")) {
                List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
                if (!choices.isEmpty()) {
                    Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
                    return (String) message.get("content");
                }
            }
        } catch (Exception e) {
            log.error("Failed to generate AI comparison summary", e);
        }
        return null;
    }
}
