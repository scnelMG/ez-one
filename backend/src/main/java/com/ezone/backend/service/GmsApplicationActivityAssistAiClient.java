package com.ezone.backend.service;

import com.ezone.backend.dto.extension.ApplicationActivityAssistRequest;
import com.ezone.backend.dto.extension.ApplicationActivityRecommendation;
import com.ezone.backend.dto.extension.ApplicationActivityRecommendationDraft;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
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
public class GmsApplicationActivityAssistAiClient implements ApplicationActivityAssistAiClient {

    private static final Logger log = LoggerFactory.getLogger(GmsApplicationActivityAssistAiClient.class);
    private static final String DEFAULT_BASE_URL = "https://gms.ssafy.io/gmsapi/api.openai.com/v1";
    private static final int MAX_CANDIDATES_FOR_AI = 8;
    private static final int MAX_FIELD_CHARS = 300;
    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {
    };

    private static final String PROMPT_TEMPLATE = """
        역할: 당신은 한국 IT 채용 담당자이자 실무 리뷰어입니다.

        목표: 지원 직무와 입력 필드에 가장 적합한 사용자 활동을 고르고, 바로 붙여넣을 수 있는 한국어 문장을 작성합니다.

        평가 기준:
        - 직무 관련성: 35점
        - 본인 기여와 역할 명확성: 20점
        - 성과, 결과, 근거의 구체성: 20점
        - 기술 또는 도메인 깊이: 15점
        - 감지된 입력 필드와의 적합성: 10점

        작성 원칙:
        - 추천은 최대 %d개만 반환합니다.
        - 제공된 후보 JSON의 사실만 사용합니다. 수치, 기술, 수상, 조직명, 날짜, 회사 정보는 만들지 않습니다.
        - draft.text는 감지된 입력 필드에 붙여넣을 수 있는 한국어 문장이어야 합니다.
        - draft.text는 한 문단으로 작성하고 마크다운, 글머리표, placeholder를 쓰지 않습니다.
        - draft.text는 %d %s 이내로 작성합니다. 제한이 짧으면 역할, 행동, 성과를 우선합니다.
        - detail limit이 200자 이상이면 draft.text는 제한의 90%%~100%%를 목표로 충분히 구체적으로 작성합니다.
        - 활동 자체 설명보다 지원 직무에 왜 맞는지를 보여줍니다.
        - 근거가 약한 부분은 risks에 적고, 더 강한 사실로 꾸미지 않습니다.
        - fitScore는 평가 기준을 따른 0부터 100까지의 정수입니다.

        출력은 JSON schema만 따릅니다.

        회사명: %s
        지원 직무: %s
        페이지 문맥: %s
        입력 필드 라벨: %s
        후보 활동 JSON: %s
        """;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final String baseUrl;
    private final String model;

    public GmsApplicationActivityAssistAiClient(
        RestTemplate restTemplate,
        ObjectMapper objectMapper,
        @Value("${gms.ai.api-key:}") String apiKey,
        @Value("${gms.ai.base-url:" + DEFAULT_BASE_URL + "}") String baseUrl,
        @Value("${gms.ai.recommendation-model:gpt-4.1-mini}") String model
    ) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.baseUrl = trimTrailingSlash(baseUrl == null || baseUrl.isBlank() ? DEFAULT_BASE_URL : baseUrl);
        this.model = model == null || model.isBlank() ? "gpt-4.1-mini" : model.trim();
    }

    @Override
    public Optional<List<ApplicationActivityRecommendation>> recommend(
        ApplicationActivityAssistRequest request,
        List<ApplicationActivityAssistService.ActivityCandidate> candidates,
        int maxItems,
        int detailLimit,
        String detailLimitUnit
    ) {
        if (apiKey.isBlank()) {
            return Optional.empty();
        }
        try {
            Map<String, Object> response = restTemplate.postForObject(
                baseUrl + "/responses",
                new HttpEntity<>(requestBody(request, candidates, maxItems, detailLimit, detailLimitUnit), headers()),
                Map.class
            );
            return extractText(response).flatMap(text -> parse(text, detailLimit, detailLimitUnit));
        }
        catch (RestClientException | IllegalArgumentException exception) {
            log.warn("GMS activity assist failed: {}", exception.getMessage());
            return Optional.empty();
        }
    }

    private HttpHeaders headers() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);
        return headers;
    }

    private Map<String, Object> requestBody(
        ApplicationActivityAssistRequest request,
        List<ApplicationActivityAssistService.ActivityCandidate> candidates,
        int maxItems,
        int detailLimit,
        String detailLimitUnit
    ) {
        return Map.of(
            "model", model,
            "input", prompt(request, candidates, maxItems, detailLimit, detailLimitUnit),
            "text", Map.of("format", activitySchema()),
            "temperature", 0.2,
            "max_output_tokens", 900
        );
    }

    private Map<String, Object> activitySchema() {
        Map<String, Object> draftSchema = objectSchema(Map.of(
            "label", stringSchema("붙여넣기 문장 용도"),
            "text", stringSchema("지원서 입력 필드에 바로 붙여넣을 한국어 문장")
        ), List.of("label", "text"));

        Map<String, Object> recommendationSchema = objectSchema(Map.of(
            "rank", integerSchema("추천 순위"),
            "title", stringSchema("활동명"),
            "fitScore", integerSchema("0부터 100까지의 직무 적합도 점수"),
            "recruiterView", stringSchema("채용 담당자 관점의 추천 이유"),
            "practitionerView", stringSchema("실무자 관점의 추천 이유"),
            "appealPoints", arraySchema(stringSchema("어필 포인트")),
            "risks", arraySchema(stringSchema("주의하거나 보강할 점")),
            "drafts", arraySchema(draftSchema)
        ), List.of("rank", "title", "fitScore", "recruiterView", "practitionerView", "appealPoints", "risks", "drafts"));

        Map<String, Object> rootSchema = objectSchema(
            Map.of("recommendations", arraySchema(recommendationSchema)),
            List.of("recommendations")
        );

        return Map.of(
            "type", "json_schema",
            "name", "application_activity_recommendations",
            "strict", true,
            "schema", rootSchema
        );
    }

    private Map<String, Object> objectSchema(Map<String, Object> properties, List<String> required) {
        return Map.of(
            "type", "object",
            "additionalProperties", false,
            "properties", properties,
            "required", required
        );
    }

    private Map<String, Object> arraySchema(Map<String, Object> itemSchema) {
        return Map.of("type", "array", "items", itemSchema);
    }

    private Map<String, Object> stringSchema(String description) {
        return Map.of("type", "string", "description", description);
    }

    private Map<String, Object> integerSchema(String description) {
        return Map.of("type", "integer", "description", description);
    }

    private String prompt(
        ApplicationActivityAssistRequest request,
        List<ApplicationActivityAssistService.ActivityCandidate> candidates,
        int maxItems,
        int detailLimit,
        String detailLimitUnit
    ) {
        List<Map<String, Object>> compactCandidates = new ArrayList<>();
        int candidateLimit = Math.min(candidates.size(), MAX_CANDIDATES_FOR_AI);
        for (int index = 0; index < candidateLimit; index += 1) {
            ApplicationActivityAssistService.ActivityCandidate candidate = candidates.get(index);
            Map<String, Object> compact = new LinkedHashMap<>();
            compact.put("id", index + 1);
            compact.put("category", truncate(candidate.category()));
            compact.put("title", truncate(candidate.title()));
            compact.put("role", truncate(candidate.role()));
            compact.put("organization", truncate(candidate.organization()));
            compact.put("summary", truncate(candidate.summary()));
            compact.put("outcome", truncate(candidate.outcome()));
            compact.put("skills", truncate(candidate.skills()));
            compactCandidates.add(compact);
        }
        return PROMPT_TEMPLATE.formatted(
            maxItems,
            detailLimit,
            detailLimitUnit,
            safe(request.companyName()),
            safe(request.positionTitle()),
            truncate(safe(request.pageContext())),
            request.fieldLabels() == null ? List.of() : request.fieldLabels().stream().map(this::truncate).toList(),
            toJson(compactCandidates)
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
            if (!(outputItem instanceof Map<?, ?> outputMap)) continue;
            Object content = outputMap.get("content");
            if (!(content instanceof List<?> contentItems)) continue;
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

    private Optional<List<ApplicationActivityRecommendation>> parse(String text, int detailLimit, String detailLimitUnit) {
        try {
            Map<String, Object> root = objectMapper.readValue(unwrapJson(text), MAP_TYPE);
            Object recommendationsValue = root.get("recommendations");
            if (!(recommendationsValue instanceof List<?> recommendationItems)) {
                return Optional.empty();
            }
            List<ApplicationActivityRecommendation> recommendations = new ArrayList<>();
            for (Object item : recommendationItems) {
                if (item instanceof Map<?, ?> map) {
                    recommendations.add(toRecommendation(map, detailLimit, detailLimitUnit));
                }
            }
            return Optional.of(recommendations);
        }
        catch (JsonProcessingException exception) {
            return Optional.empty();
        }
    }

    private ApplicationActivityRecommendation toRecommendation(Map<?, ?> map, int detailLimit, String detailLimitUnit) {
        List<ApplicationActivityRecommendationDraft> drafts = new ArrayList<>();
        Object draftsValue = map.get("drafts");
        if (draftsValue instanceof List<?> draftItems) {
            for (Object draftItem : draftItems) {
                if (draftItem instanceof Map<?, ?> draftMap) {
                    String text = fitToLimit(stringValue(draftMap.get("text")), detailLimit, detailLimitUnit);
                    drafts.add(toDraft(defaultText(stringValue(draftMap.get("label")), "글자수 맞춤"), text, detailLimit, detailLimitUnit));
                }
            }
        }
        return new ApplicationActivityRecommendation(
            intValue(map.get("rank")),
            stringValue(map.get("title")),
            intValue(map.get("fitScore")),
            stringValue(map.get("recruiterView")),
            stringValue(map.get("practitionerView")),
            stringList(map.get("appealPoints")),
            stringList(map.get("risks")),
            drafts
        );
    }

    private ApplicationActivityRecommendationDraft toDraft(String label, String text, int limit, String unit) {
        int charCount = text.length();
        int byteCount = text.getBytes(StandardCharsets.UTF_8).length;
        int count = "byte".equals(unit) ? byteCount : charCount;
        return new ApplicationActivityRecommendationDraft(label, text, charCount, byteCount, count > limit);
    }

    private String fitToLimit(String text, int limit, String unit) {
        String value = text == null ? "" : text.trim();
        while (!value.isEmpty()) {
            int count = "byte".equals(unit) ? value.getBytes(StandardCharsets.UTF_8).length : value.length();
            if (count <= limit) return value;
            value = value.substring(0, value.length() - 1).stripTrailing();
        }
        return value;
    }

    private List<String> stringList(Object value) {
        if (!(value instanceof List<?> items)) {
            return List.of();
        }
        return items.stream()
            .map(Object::toString)
            .filter(text -> !text.isBlank())
            .toList();
    }

    private int intValue(Object value) {
        if (value instanceof Number number) {
            return number.intValue();
        }
        try {
            return Integer.parseInt(String.valueOf(value));
        }
        catch (NumberFormatException exception) {
            return 0;
        }
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

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        }
        catch (JsonProcessingException exception) {
            return "[]";
        }
    }

    private String defaultText(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private String stringValue(Object value) {
        return value == null ? "" : value.toString().trim();
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }

    private String truncate(String value) {
        String safeValue = safe(value);
        return safeValue.length() <= MAX_FIELD_CHARS ? safeValue : safeValue.substring(0, MAX_FIELD_CHARS).stripTrailing();
    }

    private String trimTrailingSlash(String value) {
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }
}
