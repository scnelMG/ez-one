package com.ezone.backend.service;

import com.ezone.backend.domain.persistence.MattermostParsedJobPostRow;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
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
    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {
    };
    private static final String PROMPT_TEMPLATE = """
        역할: 당신은 SSAFY 교육생의 온보딩 프로필과 Mattermost 채용 공고를 비교해 검토 우선순위를 평가하는 추천 평가자입니다.

        목표: 아래 사용자 프로필과 공고 정보만 근거로, 사용자가 지금 이 공고를 검토할 가치가 있는지 0부터 100까지 평가합니다.

        평가 기준:
        - 희망 직무와 공고 직무의 직접 적합도: 35점
        - 보유 기술과 공고 기술 키워드의 연결성: 25점
        - 희망 기업 유형, 업종, 지역과 공고 정보의 연결성: 20점
        - 마감 정보의 긴급성 또는 검토 시점의 유효성: 10점
        - 공고명, 회사명, URL 등 사용자가 확인 가능한 근거의 명확성: 10점

        점수 산정 방식:
        - score는 0부터 100 사이의 정수 하나로만 냅니다.
        - 5점 단위나 10점 단위로 반올림하지 않습니다.
        - 비슷한 공고라도 프로필 적합도, 기술 키워드, 지역, 마감, 근거 명확성 차이를 반영해 83, 87, 91처럼 세밀하게 구분합니다.
        - 근거가 부족하면 점수를 높게 주지 말고, 확인 가능한 정보가 명확할수록 점수를 조정합니다.

        제한:
        - 합격 가능성, 서류 통과 가능성, 채용 확률은 말하지 않습니다.
        - 근거 없는 회사 정보나 채용 가능성은 추정하지 않습니다.
        - 입력에 없는 회사 평판, 연봉, 채용 규모, 합격 난이도는 추정하지 않습니다.
        - 프로필이 미입력인 항목은 감점 근거로 과도하게 사용하지 말고, 확인 가능한 공고 정보 중심으로 판단합니다.
        - reason은 사용자가 목록에서 바로 이해할 수 있는 한국어 한 문장으로 씁니다.
        - 회사명과 공고 직무명을 reason에 반드시 포함합니다.
        - reason에는 보유 기술, 희망 직무, 희망 지역 중 실제로 연결되는 구체 항목을 최소 1개 포함합니다.
        - "희망 직무와 보유 기술, 지역이 공고와 일부 부합", "검토할 가치가 있습니다"처럼 모든 공고에 붙일 수 있는 문장만 쓰지 않습니다.
        - 각 공고마다 다른 근거가 보이도록 회사명, 직무명, 기술명, 지역명, 마감일 중 확인된 값을 조합합니다.
        - score는 0부터 100까지의 정수입니다.

        출력은 JSON schema만 따릅니다.

        %s

        공고 정보:
        - 회사명: %s
        - 공고명: %s
        - 마감: %s
        - 공고 URL: %s
        """;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final String baseUrl;
    private final String model;

    public GmsAiJobRecommendationClient(
        RestTemplate restTemplate,
        ObjectMapper objectMapper,
        @Value("${gms.ai.api-key:}") String apiKey,
        @Value("${gms.ai.base-url}") String baseUrl,
        @Value("${gms.ai.recommendation-model:gpt-4.1-mini}") String model
    ) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.baseUrl = trimTrailingSlash(baseUrl == null || baseUrl.isBlank() ? "" : baseUrl);
        this.model = model == null || model.isBlank() ? "gpt-4.1-mini" : model.trim();
    }

    @Override
    public Optional<AiRecommendationSignal> recommend(MattermostParsedJobPostRow row, UserRecommendationProfile profile) {
        if (apiKey.isBlank()) {
            return Optional.empty();
        }
        try {
            Map<String, Object> response = restTemplate.postForObject(
                baseUrl + "/responses",
                new HttpEntity<>(requestBody(row, profile), headers()),
                Map.class
            );
            UserRecommendationProfile safeProfile = profile == null ? UserRecommendationProfile.empty() : profile;
            return extractText(response).flatMap(text -> parseSignal(text, row, safeProfile));
        }
        catch (RestClientException | IllegalArgumentException exception) {
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

    private Map<String, Object> requestBody(MattermostParsedJobPostRow row, UserRecommendationProfile profile) {
        return Map.of(
            "model", model,
            "input", prompt(row, profile),
            "text", Map.of("format", recommendationSchema()),
            "temperature", 0.2,
            "max_output_tokens", 220
        );
    }

    private String prompt(MattermostParsedJobPostRow row, UserRecommendationProfile profile) {
        UserRecommendationProfile safeProfile = profile == null ? UserRecommendationProfile.empty() : profile;
        return PROMPT_TEMPLATE.formatted(
            safeProfile.promptSummary(),
            safe(row.getCompanyName()),
            safe(row.getTitle()),
            safe(row.getDeadlineLabel()),
            safe(row.getUrl())
        );
    }

    private Map<String, Object> recommendationSchema() {
        Map<String, Object> schema = Map.of(
            "type", "object",
            "additionalProperties", false,
            "properties", Map.of(
                "score", Map.of("type", "integer", "description", "0부터 100까지의 검토 추천도"),
                "recommended", Map.of("type", "boolean", "description", "우선 검토 권장 여부"),
                "reason", Map.of("type", "string", "description", "사용자에게 보여줄 한국어 한 문장 추천 사유"),
                "evidence", Map.of(
                    "type", "array",
                    "items", Map.of("type", "string", "description", "프로필 또는 공고 입력에서 확인 가능한 근거")
                )
            ),
            "required", List.of("score", "recommended", "reason", "evidence")
        );
        return Map.of(
            "type", "json_schema",
            "name", "mattermost_job_recommendation",
            "strict", true,
            "schema", schema
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

    private Optional<AiRecommendationSignal> parseSignal(
        String text,
        MattermostParsedJobPostRow row,
        UserRecommendationProfile profile
    ) {
        try {
            Map<String, Object> root = objectMapper.readValue(unwrapJson(text), MAP_TYPE);
            Object scoreValue = root.get("score");
            Object reasonValue = root.get("reason");
            if (scoreValue == null || reasonValue == null || reasonValue.toString().isBlank()) {
                return Optional.empty();
            }
            return Optional.of(new AiRecommendationSignal(
                normalizeScore(intValue(scoreValue)),
                personalizedReasonV2(reasonValue.toString(), root.get("evidence"), row, profile)
            ));
        }
        catch (JsonProcessingException exception) {
            return Optional.empty();
        }
    }

    private String personalizedReasonV2(
        String reason,
        Object evidenceValue,
        MattermostParsedJobPostRow row,
        UserRecommendationProfile profile
    ) {
        String cleaned = safe(reason);
        if (!isGenericReasonV2(cleaned) && containsAny(cleaned, safe(row.getCompanyName()), firstTitleToken(row))) {
            return cleaned;
        }

        List<String> matches = concreteMatches(row, profile, evidenceValue);
        String matchText = matches.isEmpty()
            ? "공고명과 마감 정보"
            : String.join(", ", matches);
        String deadline = safe(row.getDeadlineLabel()).isBlank()
            ? ""
            : ", 마감 " + safe(row.getDeadlineLabel()) + " 기준";
        return "%s의 %s 공고는 %s와 연결되어%s 먼저 검토할 만합니다.".formatted(
            fallback(safe(row.getCompanyName()), "해당 회사"),
            fallback(safe(row.getTitle()), "채용"),
            matchText,
            deadline
        );
    }

    private boolean isGenericReasonV2(String reason) {
        String value = safe(reason);
        return value.isBlank()
            || value.contains("희망 직무와 보유 기술, 지역이 공고와 일부 부합")
            || value.contains("검토할 가치가 있습니다")
            || value.contains("프로필과 공고가 잘 맞습니다")
            || value.contains("연결 근거가 AI")
            || value.contains("연결 근거가 Java");
    }

    private String personalizedReason(
        String reason,
        Object evidenceValue,
        MattermostParsedJobPostRow row,
        UserRecommendationProfile profile
    ) {
        String cleaned = safe(reason);
        if (!isGenericReason(cleaned) && containsAny(cleaned, safe(row.getCompanyName()), firstTitleToken(row))) {
            return cleaned;
        }

        List<String> matches = concreteMatches(row, profile, evidenceValue);
        String matchText = matches.isEmpty()
            ? "공고명과 마감 정보"
            : String.join(", ", matches);
        String deadline = safe(row.getDeadlineLabel()).isBlank() ? "" : ", 마감 " + safe(row.getDeadlineLabel()) + " 기준에서도";
        return "%s의 %s 공고는 연결 근거가 %s이고%s 먼저 확인할 만합니다.".formatted(
            fallback(safe(row.getCompanyName()), "해당 회사"),
            fallback(safe(row.getTitle()), "채용"),
            matchText,
            deadline
        );
    }

    private boolean isGenericReason(String reason) {
        String value = safe(reason);
        return value.isBlank()
            || value.contains("희망 직무와 보유 기술, 지역이 공고와 일부 부합")
            || value.contains("검토할 가치가 있습니다")
            || value.contains("프로필과 공고가 잘 맞습니다");
    }

    private List<String> concreteMatches(
        MattermostParsedJobPostRow row,
        UserRecommendationProfile profile,
        Object evidenceValue
    ) {
        String searchable = (safe(row.getTitle()) + " " + safe(row.getCompanyName()) + " " + evidenceText(evidenceValue))
            .toLowerCase();
        List<String> matches = new ArrayList<>();
        addFirstMatching(matches, profile.desiredRoles(), searchable);
        addFirstMatching(matches, profile.skills(), searchable);
        addFirstMatching(matches, profile.regions(), searchable);
        if (matches.isEmpty()) {
            matches.add(firstTitleToken(row));
        }
        return matches.stream()
            .filter(value -> !safe(value).isBlank())
            .distinct()
            .limit(3)
            .toList();
    }

    private void addFirstMatching(List<String> matches, List<String> candidates, String searchable) {
        for (String candidate : candidates) {
            String value = safe(candidate);
            if (!value.isBlank() && searchable.contains(value.toLowerCase())) {
                matches.add(value);
                return;
            }
        }
    }

    private String evidenceText(Object evidenceValue) {
        if (evidenceValue instanceof List<?> values) {
            return String.join(" ", values.stream().map(String::valueOf).toList());
        }
        return safe(evidenceValue == null ? "" : String.valueOf(evidenceValue));
    }

    private boolean containsAny(String value, String... needles) {
        String haystack = safe(value);
        for (String needle : needles) {
            if (!safe(needle).isBlank() && haystack.contains(safe(needle))) {
                return true;
            }
        }
        return false;
    }

    private String firstTitleToken(MattermostParsedJobPostRow row) {
        String title = safe(row.getTitle());
        if (title.isBlank()) {
            return "";
        }
        return title.split("[\\s(/\\[]+", 2)[0];
    }

    private String fallback(String value, String fallback) {
        return value.isBlank() ? fallback : value;
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

    private int normalizeScore(int score) {
        return Math.max(0, Math.min(score, 100));
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
