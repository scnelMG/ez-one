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
    void localServerBindsToIpv4LoopbackForChromeExtensionApiCalls() throws IOException {
        String applicationYaml = Files.readString(Path.of("src/main/resources/application.yml"), StandardCharsets.UTF_8);

        assertThat(applicationYaml)
            .contains("address: ${SERVER_ADDRESS:127.0.0.1}")
            .doesNotContain("address: ${SERVER_ADDRESS:::1}");
    }

    @Test
    void backendKeepsRunningAfterStartupTasksFinish() throws IOException {
        String applicationYaml = Files.readString(Path.of("src/main/resources/application.yml"), StandardCharsets.UTF_8);

        assertThat(applicationYaml).contains("keep-alive: true");
    }

    @Test
    void companyDataBulkSyncIsOptInForLocalRuns() throws IOException {
        String applicationYaml = Files.readString(Path.of("src/main/resources/application.yml"), StandardCharsets.UTF_8);

        assertThat(applicationYaml)
            .contains("enabled: ${COMPANY_DATA_STARTUP_SYNC_ENABLED:false}")
            .contains("enabled: ${COMPANY_DATA_BATCH_SYNC_ENABLED:false}");
    }

    @Test
    void localDevAccessTokenIsOptInAndCorsDoesNotDefaultToExtensionWildcard() throws IOException {
        String applicationYaml = Files.readString(Path.of("src/main/resources/application.yml"), StandardCharsets.UTF_8);

        assertThat(applicationYaml)
            .contains("local-dev-token-enabled: ${AUTH_LOCAL_DEV_TOKEN_ENABLED:false}")
            .contains("secure: ${AUTH_REFRESH_COOKIE_SECURE:false}")
            .contains("same-site: ${AUTH_REFRESH_COOKIE_SAME_SITE:Lax}")
            .contains("enabled: ${APP_DOCS_ENABLED:false}")
            .doesNotContain("chrome-extension://*");
    }

    @Test
    void userFacingBackendLinksUseConfigurablePublicBaseUrl() throws IOException {
        String applicationYaml = Files.readString(Path.of("src/main/resources/application.yml"), StandardCharsets.UTF_8);
        String emailService = Files.readString(
            Path.of("src/main/java/com/ezone/backend/service/EmailService.java"),
            StandardCharsets.UTF_8
        );
        String studyService = Files.readString(
            Path.of("src/main/java/com/ezone/backend/service/StudyService.java"),
            StandardCharsets.UTF_8
        );

        assertThat(applicationYaml).contains("public-base-url: ${APP_PUBLIC_BASE_URL:http://localhost:5173}");
        assertThat(emailService).doesNotContain("http://localhost:5173/study");
        assertThat(studyService).doesNotContain("http://localhost:8080/uploads");
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
    void dartAiAnalysisModelDefaultsToCostControlledStableModel() throws IOException {
        String applicationYaml = Files.readString(Path.of("src/main/resources/application.yml"), StandardCharsets.UTF_8);

        assertThat(applicationYaml)
            .contains("analysis-model: ${DART_AI_ANALYSIS_MODEL:gpt-4.1}")
            .contains("compare-model: ${DART_AI_COMPARE_MODEL:gpt-4.1-mini}");
    }

    @Test
    void profileImageMigrationIsSafeWhenColumnAlreadyExists() throws IOException {
        String migration = Files.readString(
            Path.of("src/main/resources/db/migration/V36__add_user_profile_image_url.sql"),
            StandardCharsets.UTF_8
        ).toLowerCase();

        assertThat(migration)
            .contains("information_schema.columns")
            .contains("column_name = 'profile_image_url'")
            .contains("alter table users add column profile_image_url mediumtext null after nickname");
    }
}
