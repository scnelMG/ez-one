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
    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {
    };

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
            "temperature", 0.2,
            "max_output_tokens", 900
        );
    }

    private String prompt(
        ApplicationActivityAssistRequest request,
        List<ApplicationActivityAssistService.ActivityCandidate> candidates,
        int maxItems,
        int detailLimit,
        String detailLimitUnit
    ) {
        List<Map<String, Object>> compactCandidates = new ArrayList<>();
        for (int index = 0; index < candidates.size(); index += 1) {
            ApplicationActivityAssistService.ActivityCandidate candidate = candidates.get(index);
            compactCandidates.add(new LinkedHashMap<>(Map.of(
                "id", index + 1,
                "category", candidate.category(),
                "title", candidate.title(),
                "role", candidate.role(),
                "organization", candidate.organization(),
                "summary", candidate.summary(),
                "outcome", candidate.outcome(),
                "skills", candidate.skills()
            )));
        }
        return """
            Role: You are a Korean tech recruiter and senior practitioner reviewing application form activity fields.

            Task: rank the candidate activities by job fit first, then write paste-ready Korean drafts that fit the detected field limit.

            Fit scoring rubric:
            - Job relevance to the Position and Page context: 35 points.
            - Direct ownership, role clarity, and contribution scope: 20 points.
            - Concrete outcome, impact, or evidence: 20 points.
            - Technical/domain depth and transferable skills: 15 points.
            - Clarity and usability for the detected Field labels: 10 points.

            Draft-writing rules:
            - Recommend at most %d items.
            - Use only facts present in Candidates JSON. Do not invent metrics, technologies, awards, organizations, dates, or company facts.
            - Each draft.text must be directly pasteable into the detected field: one concise Korean paragraph, no markdown, no bullets, no placeholder text.
            - Keep each draft.text within %d %s. If the limit is tight, preserve role, action, and impact before details.
            - Emphasize why the activity fits the target Position, not just what the activity was.
            - If evidence is weak, mention the risk in risks instead of fabricating stronger proof.
            - fitScore must follow the rubric and be an integer from 0 to 100.

            Return JSON only with this exact shape:
            {"recommendations":[{"rank":1,"title":"...","fitScore":0,"recruiterView":"...","practitionerView":"...","appealPoints":["..."],"risks":["..."],"drafts":[{"label":"글자수 맞춤","text":"..."}]}]}

            Company: %s
            Position: %s
            Page context: %s
            Field labels: %s
            Candidates JSON: %s
            """.formatted(
            maxItems,
            detailLimit,
            detailLimitUnit,
            safe(request.companyName()),
            safe(request.positionTitle()),
            safe(request.pageContext()),
            request.fieldLabels() == null ? List.of() : request.fieldLabels(),
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

    private String trimTrailingSlash(String value) {
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }
}
