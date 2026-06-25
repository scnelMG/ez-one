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
            당신은 한국어 자기소개서 작성을 돕는 지원서 분석 어시스턴트입니다.
            제공된 DART 보고서 텍스트만 근거로 사용합니다.
            투자 조언, 주가 전망, 채용 가능성, 근거 없는 주장은 작성하지 않습니다.
            보고서 전체를 요약하지 않습니다.
            JD와 직무에 연결되어 자기소개서 근거가 될 수 있는 사실만 간결하게 선별합니다.
            중복 사실, 회계 중심 세부사항, 일반적인 회사 소개는 피합니다.
            이력서나 자기소개서에 활용할 수 있는 근거 카드와 어필 포인트를 우선합니다.
            핵심 주장은 반드시 출처 섹션과 접수번호를 포함해야 합니다.
            JSON을 반환하기 전에 각 근거 카드가 선택된 접수번호에 기반하는지,
            투자/채용 가능성 표현이 없는지, 일반적인 회사 소개에 그치지 않는지 자체 점검합니다.
            제공된 JSON schema와 일치하는 엄격한 JSON만 반환합니다.
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
