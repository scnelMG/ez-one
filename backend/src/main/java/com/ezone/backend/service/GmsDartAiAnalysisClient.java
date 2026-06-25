package com.ezone.backend.service;

import com.ezone.backend.dto.dart.DartAnalysisContentResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

@Service
public class GmsDartAiAnalysisClient implements DartAiAnalysisClient {

    private static final String DEFAULT_BASE_URL = "https://gms.ssafy.io/gmsapi/api.openai.com/v1";

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final String baseUrl;
    private final String analysisModel;

    public GmsDartAiAnalysisClient(
        RestTemplate restTemplate,
        ObjectMapper objectMapper,
        @Value("${gms.ai.api-key:}") String apiKey,
        @Value("${gms.ai.base-url:" + DEFAULT_BASE_URL + "}") String baseUrl,
        @Value("${dart.ai.analysis-model:gpt-4.1}") String analysisModel
    ) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
        this.apiKey = apiKey;
        this.baseUrl = StringUtils.hasText(baseUrl) ? baseUrl : DEFAULT_BASE_URL;
        this.analysisModel = StringUtils.hasText(analysisModel) ? analysisModel : "gpt-4.1";
    }

    @Override
    public DartAiAnalysisResult analyze(DartAiAnalysisRequest request) {
        if (!StringUtils.hasText(apiKey)) {
            throw new IllegalStateException("GMS API key is not configured.");
        }
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);
        JsonNode response = restTemplate.postForObject(
            baseUrl + "/responses",
            new HttpEntity<>(requestBody(request), headers),
            JsonNode.class
        );
        String outputText = extractOutputText(response);
        if (!StringUtils.hasText(outputText)) {
            throw new IllegalStateException("GMS AI response did not include output text.");
        }
        try {
            DartAnalysisContentResponse content = objectMapper.readValue(
                outputText,
                DartAnalysisContentResponse.class
            );
            return new DartAiAnalysisResult(analysisModel, content);
        } catch (Exception exception) {
            throw new IllegalStateException("GMS AI response JSON could not be parsed.", exception);
        }
    }

    private Map<String, Object> requestBody(DartAiAnalysisRequest request) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", analysisModel);
        body.put("input", List.of(
            Map.of(
                "role", "system",
                "content", systemPrompt()
            ),
            Map.of(
                "role", "user",
                "content", userPrompt(request)
            )
        ));
        body.put("text", Map.of("format", jsonSchema()));
        return body;
    }

    private String systemPrompt() {
        return """
            You are an assistant for Korean job application preparation.
            Use only the provided DART report text.
            Do not provide investment advice, stock outlooks, hiring probability, or unsupported claims.
            Do not summarize the whole report and do not create a generic company profile.
            Your job is to curate concise, JD-relevant DART facts and explain how the applicant can use them in an essay.
            Avoid duplicate facts, accounting-heavy details, audit/internal-control details, and generic company introductions.
            Reject weak accounting-only facts unless the target JD is explicitly accounting, finance, audit, risk, compliance, or IR.
            Prefer actual products, services, customers, channels, customer value, technology, R&D, market strategy, partnerships, production, and new business facts.
            If a section lacks useful JD-relevant evidence, leave that section intentionally sparse instead of forcing a weak connection.
            Prioritize evidence cards, section analyses, and appeal points that can support 지원동기, 직무역량, or 입사 후 포부.
            Every core claim must include a source section and receipt number.
            Before returning JSON, self-check that each evidence card is grounded in the selected receipt number,
            removes investment or hiring-probability language, avoids generic company introductions,
            and includes a practical essay-use recommendation.
            Return strict JSON matching the provided schema.
            """;
    }

    private String userPrompt(DartAiAnalysisRequest request) {
        return DartAnalysisPromptBuilder.build(request);
    }

    private Map<String, Object> jsonSchema() {
        Map<String, Object> evidenceCard = Map.of(
            "type", "object",
            "additionalProperties", false,
            "properties", Map.of(
                "title", Map.of("type", "string"),
                "summary", Map.of("type", "string"),
                "sourceSection", Map.of("type", "string"),
                "rceptNo", Map.of("type", "string"),
                "relevanceScore", Map.of("type", "integer", "minimum", 0, "maximum", 100)
            ),
            "required", List.of("title", "summary", "sourceSection", "rceptNo", "relevanceScore")
        );
        Map<String, Object> stringArray = Map.of("type", "array", "items", Map.of("type", "string"));
        Map<String, Object> resumeUsePoint = Map.of(
            "type", "object",
            "additionalProperties", false,
            "properties", Map.of(
                "useCase", Map.of("type", "string"),
                "recommendation", Map.of("type", "string")
            ),
            "required", List.of("useCase", "recommendation")
        );
        Map<String, Object> sectionAnalysis = Map.of(
            "type", "object",
            "additionalProperties", false,
            "properties", Map.of(
                "sectionTitle", Map.of("type", "string"),
                "coreSummary", Map.of("type", "string"),
                "evidencePoints", stringArray,
                "jobFitPoints", stringArray,
                "resumeUsePoints", Map.of("type", "array", "items", resumeUsePoint),
                "sentenceCandidates", stringArray,
                "cautionPoints", stringArray,
                "rawText", Map.of("type", "string")
            ),
            "required", List.of(
                "sectionTitle",
                "coreSummary",
                "evidencePoints",
                "jobFitPoints",
                "resumeUsePoints",
                "sentenceCandidates",
                "cautionPoints",
                "rawText"
            )
        );
        return Map.of(
            "type", "json_schema",
            "name", "dart_analysis",
            "strict", true,
            "schema", Map.of(
                "type", "object",
                "additionalProperties", false,
                "properties", Map.of(
                    "evidenceCards", Map.of("type", "array", "items", evidenceCard),
                    "appealPoints", stringArray,
                    "suggestedSentences", stringArray,
                    "cautions", stringArray,
                    "missingInfo", stringArray,
                    "mainProductsAndServices", sectionAnalysis,
                    "contractsAndRAndD", sectionAnalysis,
                    "otherNotes", sectionAnalysis
                ),
                "required", List.of(
                    "evidenceCards",
                    "appealPoints",
                    "suggestedSentences",
                    "cautions",
                    "missingInfo",
                    "mainProductsAndServices",
                    "contractsAndRAndD",
                    "otherNotes"
                )
            )
        );
    }

    private String extractOutputText(JsonNode response) {
        if (response == null) {
            return "";
        }
        if (response.hasNonNull("output_text")) {
            return response.path("output_text").asText("");
        }
        StringBuilder output = new StringBuilder();
        for (JsonNode outputItem : response.path("output")) {
            for (JsonNode contentItem : outputItem.path("content")) {
                if (contentItem.hasNonNull("text")) {
                    output.append(contentItem.path("text").asText());
                }
            }
        }
        return output.toString();
    }

}
