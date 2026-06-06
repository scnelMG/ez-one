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
}
