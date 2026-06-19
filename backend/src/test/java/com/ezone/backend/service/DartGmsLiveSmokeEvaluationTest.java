package com.ezone.backend.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.ezone.backend.dto.dart.DartDisclosureResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

@EnabledIfEnvironmentVariable(named = "DART_LIVE_SMOKE_ENABLED", matches = "true")
class DartGmsLiveSmokeEvaluationTest {

    private static final List<SampleCompany> SAMPLES = List.of(
        new SampleCompany("삼성전자", "제조", "Backend Developer", "지원 회사의 사업 방향과 내 경험을 어떻게 연결할 수 있나요?"),
        new SampleCompany("카카오", "IT 플랫폼", "Backend Developer", "플랫폼 서비스 안정성과 확장성 측면에서 어필할 근거를 찾아주세요."),
        new SampleCompany("KB금융지주", "금융", "Backend Developer", "금융 서비스 신뢰성과 데이터 기반 역량을 어필할 근거를 찾아주세요.")
    );
    private static final Map<String, Integer> MODEL_CREDITS = Map.of(
        "gpt-5.4-mini", 14,
        "gpt-4.1", 16
    );

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final DartAnalysisQualityEvaluator evaluator = new DartAnalysisQualityEvaluator();

    @Test
    void evaluatesLiveDartGmsAiQualityAcrossRepresentativeIndustries() throws IOException {
        LiveSmokeEnv env = LiveSmokeEnv.load();
        assertThat(env.openDartApiKey()).as("OPENDART_API_KEY is required for live smoke evaluation").isNotBlank();
        assertThat(env.gmsApiKey()).as("GMS_API_KEY is required for live smoke evaluation").isNotBlank();

        RestTemplate restTemplate = restTemplate();
        OpenDartClient openDartClient = new OpenDartHttpClient(restTemplate, env.openDartApiKey());
        GmsKeyStatus keyStatus = new GmsKeyInfoHttpClient(restTemplate, env.gmsApiKey()).getKeyStatus();

        List<LiveSmokeResult> results = new ArrayList<>();
        if (!keyStatus.available()) {
            results.add(LiveSmokeResult.failed("ALL", "공통", env.analysisModel(), "GMS_KEY", keyStatus.message()));
        } else {
            for (SampleCompany sample : SAMPLES) {
                results.add(evaluateSample(openDartClient, env, sample, env.analysisModel()));
            }
            long primaryPassCount = results.stream()
                .filter(result -> result.model().equals(env.analysisModel()))
                .filter(LiveSmokeResult::passed)
                .count();
            if (primaryPassCount < 2 && !"gpt-4.1".equals(env.analysisModel())) {
                SampleCompany fallbackSample = SAMPLES.stream()
                    .filter(sample -> results.stream()
                        .anyMatch(result -> result.company().equals(sample.company()) && !result.passed()))
                    .findFirst()
                    .orElse(SAMPLES.get(0));
                results.add(evaluateSample(openDartClient, env, fallbackSample, "gpt-4.1"));
            }
        }

        Path summaryPath = writeSummary(env, keyStatus, results);
        long primaryPassCount = results.stream()
            .filter(result -> result.model().equals(env.analysisModel()))
            .filter(LiveSmokeResult::passed)
            .count();

        assertThat(results)
            .extracting(LiveSmokeResult::company)
            .contains("삼성전자", "카카오", "KB금융지주");
        assertThat(primaryPassCount)
            .as("Expected at least two primary-model live DART AI analyses to pass. Summary: %s", summaryPath)
            .isGreaterThanOrEqualTo(2);
    }

    private LiveSmokeResult evaluateSample(
        OpenDartClient openDartClient,
        LiveSmokeEnv env,
        SampleCompany sample,
        String model
    ) {
        try {
            List<DartDisclosureResponse> disclosures = openDartClient.listPeriodicDisclosures(sample.company());
            if (disclosures.isEmpty()) {
                return LiveSmokeResult.failed(sample.company(), sample.industry(), model, "OPENDART_DISCLOSURE", "No periodic disclosure found.");
            }
            DartDisclosureResponse disclosure = disclosures.stream()
                .max(Comparator
                    .comparing(DartDisclosureResponse::recommended)
                    .thenComparing(DartDisclosureResponse::receivedDate, Comparator.nullsLast(String::compareTo)))
                .orElse(disclosures.get(0));
            String documentText = openDartClient.downloadDocumentText(disclosure.rceptNo());
            if (!StringUtils.hasText(documentText)) {
                return LiveSmokeResult.failed(sample.company(), sample.industry(), model, "OPENDART_DOCUMENT", "Selected disclosure text was empty.");
            }

            DartAiAnalysisClient aiClient = new GmsDartAiAnalysisClient(
                restTemplate(),
                objectMapper,
                env.gmsApiKey(),
                env.gmsBaseUrl(),
                model
            );
            DartAiAnalysisResult aiResult = aiClient.analyze(new DartAiAnalysisRequest(
                disclosure.rceptNo(),
                disclosure.reportName(),
                sample.company(),
                sample.position(),
                List.of(sample.essayQuestion()),
                documentText
            ));
            DartAnalysisEvaluation evaluation = evaluator.evaluate(aiResult.content(), disclosure.rceptNo());
            return LiveSmokeResult.completed(
                sample.company(),
                sample.industry(),
                disclosure.reportName(),
                disclosure.rceptNo(),
                model,
                MODEL_CREDITS.getOrDefault(model, 0),
                evaluation.score(),
                evaluation.content().evidenceCards().size(),
                evaluation.passed(),
                evaluation.notes()
            );
        } catch (RuntimeException exception) {
            return LiveSmokeResult.failed(
                sample.company(),
                sample.industry(),
                model,
                classifyFailure(exception),
                sanitizeFailure(exception.getMessage())
            );
        }
    }

    private Path writeSummary(
        LiveSmokeEnv env,
        GmsKeyStatus keyStatus,
        List<LiveSmokeResult> results
    ) throws IOException {
        Path outputDir = Path.of("target", "dart-live-smoke");
        Files.createDirectories(outputDir);
        Path summaryPath = outputDir.resolve("latest-summary.json");
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("generatedAt", Instant.now().toString());
        summary.put("primaryModel", env.analysisModel());
        summary.put("fallbackModel", "gpt-4.1");
        summary.put("modelCredits", MODEL_CREDITS);
        summary.put("gmsKey", Map.of(
            "available", keyStatus.available(),
            "remainCredit", keyStatus.remainCredit() == null ? "unknown" : keyStatus.remainCredit(),
            "expiredDate", keyStatus.expiredDate() == null ? "unknown" : keyStatus.expiredDate(),
            "statusNote", keyStatus.message() == null ? "" : keyStatus.message()
        ));
        summary.put("results", results);
        long primaryCalls = results.stream().filter(result -> result.model().equals(env.analysisModel())).count();
        long primaryPasses = results.stream().filter(result -> result.model().equals(env.analysisModel())).filter(LiveSmokeResult::passed).count();
        double averageEvidenceCards = results.stream()
            .filter(result -> result.model().equals(env.analysisModel()))
            .mapToInt(LiveSmokeResult::evidenceCardCount)
            .average()
            .orElse(0.0d);
        summary.put("primaryModelSummary", Map.of(
            "calls", primaryCalls,
            "passes", primaryPasses,
            "passRate", primaryCalls == 0 ? 0.0d : primaryPasses / (double) primaryCalls,
            "averageEvidenceCards", averageEvidenceCards
        ));
        objectMapper.writerWithDefaultPrettyPrinter().writeValue(summaryPath.toFile(), summary);
        return summaryPath;
    }

    private static RestTemplate restTemplate() {
        return new RestTemplateBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .readTimeout(Duration.ofSeconds(90))
            .build();
    }

    private static String classifyFailure(RuntimeException exception) {
        String message = exception.getMessage() == null ? "" : exception.getMessage().toLowerCase(Locale.ROOT);
        if (message.contains("model")) {
            return "MODEL_OR_GMS";
        }
        if (message.contains("json") || message.contains("parse")) {
            return "AI_JSON_SCHEMA";
        }
        if (message.contains("timeout") || message.contains("connect")) {
            return "NETWORK";
        }
        return "UNKNOWN";
    }

    private static String sanitizeFailure(String message) {
        if (!StringUtils.hasText(message)) {
            return "No error message.";
        }
        return message.replaceAll("[A-Za-z0-9_-]{24,}", "[redacted]");
    }

    private record SampleCompany(
        String company,
        String industry,
        String position,
        String essayQuestion
    ) {
    }

    private record LiveSmokeResult(
        String company,
        String industry,
        String reportName,
        String rceptNo,
        String model,
        int modelCredit,
        int evaluationScore,
        int evidenceCardCount,
        boolean passed,
        String failureCategory,
        String failureSummary,
        List<String> improvementActions
    ) {

        static LiveSmokeResult completed(
            String company,
            String industry,
            String reportName,
            String rceptNo,
            String model,
            int modelCredit,
            int evaluationScore,
            int evidenceCardCount,
            boolean passed,
            List<String> improvementActions
        ) {
            return new LiveSmokeResult(
                company,
                industry,
                reportName,
                rceptNo,
                model,
                modelCredit,
                evaluationScore,
                evidenceCardCount,
                passed,
                "",
                "",
                List.copyOf(improvementActions)
            );
        }

        static LiveSmokeResult failed(
            String company,
            String industry,
            String model,
            String failureCategory,
            String failureSummary
        ) {
            return new LiveSmokeResult(
                company,
                industry,
                "",
                "",
                model,
                MODEL_CREDITS.getOrDefault(model, 0),
                0,
                0,
                false,
                failureCategory,
                failureSummary,
                List.of("Investigate " + failureCategory + " before enabling this model by default.")
            );
        }
    }

    private record LiveSmokeEnv(
        String openDartApiKey,
        String gmsApiKey,
        String gmsBaseUrl,
        String analysisModel
    ) {

        static LiveSmokeEnv load() throws IOException {
            Map<String, String> values = new LinkedHashMap<>();
            Path envFile = Path.of(".env");
            if (Files.exists(envFile)) {
                for (String line : Files.readAllLines(envFile, StandardCharsets.UTF_8)) {
                    int separator = line.indexOf('=');
                    if (separator <= 0 || line.stripLeading().startsWith("#")) {
                        continue;
                    }
                    values.put(line.substring(0, separator).trim(), line.substring(separator + 1).trim());
                }
            }
            System.getenv().forEach(values::put);
            return new LiveSmokeEnv(
                values.getOrDefault("OPENDART_API_KEY", ""),
                values.getOrDefault("GMS_API_KEY", ""),
                values.getOrDefault("GMS_AI_BASE_URL", "https://gms.ssafy.io/gmsapi/api.openai.com/v1"),
                values.getOrDefault("DART_AI_ANALYSIS_MODEL", "gpt-4.1")
            );
        }
    }
}
