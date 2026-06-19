package com.ezone.backend.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

class LocalConfigurationContractTest {

    @Test
    void applicationImportsBackendDotEnvForLocalRuns() throws IOException {
        String applicationYaml = Files.readString(Path.of("src/main/resources/application.yml"), StandardCharsets.UTF_8);

        assertThat(applicationYaml).contains("optional:file:.env[.properties]");
    }

    @Test
    void applicationDoesNotProvideCredentialFallbackValues() throws IOException {
        String applicationYaml = Files.readString(Path.of("src/main/resources/application.yml"), StandardCharsets.UTF_8);

        assertThat(applicationYaml).contains("username: ${MAIL_USERNAME:}");
        assertThat(applicationYaml).contains("password: ${MAIL_PASSWORD:}");
        assertThat(applicationYaml)
            .doesNotContain("MAIL_USERNAME:test")
            .doesNotContain("MAIL_PASSWORD:dummy")
            .doesNotContain("test@gmail.com");
    }

    @Test
    void mavenCompilationUsesUtf8ForKoreanDisclosureNames() throws IOException {
        String pom = Files.readString(Path.of("pom.xml"), StandardCharsets.UTF_8);

        assertThat(pom)
            .contains("<project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>")
            .contains("<project.reporting.outputEncoding>UTF-8</project.reporting.outputEncoding>");
    }

    @Test
    void dartAiAnalysisModelDefaultsToLiveSmokeValidatedCostEfficientModel() throws IOException {
        String applicationYaml = Files.readString(Path.of("src/main/resources/application.yml"), StandardCharsets.UTF_8);

        assertThat(applicationYaml)
            .contains("analysis-model: ${DART_AI_ANALYSIS_MODEL:gpt-5.4-mini}");
    }
}
