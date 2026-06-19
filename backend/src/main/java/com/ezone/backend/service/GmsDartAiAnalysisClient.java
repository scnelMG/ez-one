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
        @Value("${dart.ai.analysis-model:gpt-5.4-mini}") String analysisModel
    ) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
        this.apiKey = apiKey;
        this.baseUrl = StringUtils.hasText(baseUrl) ? baseUrl : DEFAULT_BASE_URL;
        this.analysisModel = StringUtils.hasText(analysisModel) ? analysisModel : "gpt-5.4-mini";
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
            Prioritize evidence cards and appeal points that can support a resume or essay.
            Every core claim must include a source section and receipt number.
            Before returning JSON, self-check that each evidence card is grounded in the selected receipt number,
            removes investment or hiring-probability language, and avoids generic company introductions.
            Return strict JSON matching the provided schema.
            """;
    }

    private String userPrompt(DartAiAnalysisRequest request) {
        return """
            Receipt number: %s
            Report name: %s
            Company: %s
            Position: %s
            Essay questions: %s

            Analyze the report in three steps:
            1. Extract business, new business, R&D, investment, risk, and financial signals.
            2. Rank signals by relevance to the position and essay questions.
            3. Compose source-grounded appeal cards for user review.
            4. Run a final quality check: keep only claims grounded in the selected DART report, and put uncertainty in missingInfo.

            DART report text:
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
                    "missingInfo", stringArray
                ),
                "required", List.of("evidenceCards", "appealPoints", "suggestedSentences", "cautions", "missingInfo")
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

    private static String defaultText(String value) {
        return StringUtils.hasText(value) ? value : "";
    }
}
