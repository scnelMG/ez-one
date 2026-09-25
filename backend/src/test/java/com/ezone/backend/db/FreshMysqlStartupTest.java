package com.ezone.backend.db;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/** AUTH-002/003/006: run only against a disposable, initially empty MySQL database. */
@EnabledIfEnvironmentVariable(named = "EZONE_MYSQL_TEST_URL", matches = "jdbc:mysql:.*")
@SpringBootTest(properties = {
    "spring.config.location=file:src/main/resources/application.yml",
    "spring.datasource.url=${EZONE_MYSQL_TEST_URL}",
    "spring.datasource.username=${EZONE_MYSQL_TEST_USER}",
    "spring.datasource.password=${EZONE_MYSQL_TEST_PASSWORD}",
    "spring.flyway.enabled=true",
    "spring.flyway.baseline-on-migrate=false",
    "auth.google.client-id=ci-unused-google-client",
    "auth.google.client-secret=ci-unused-google-secret",
    "auth.jwt.access-secret=ci-only-access-secret-at-least-thirty-two-characters",
    "auth.jwt.refresh-secret=ci-only-refresh-secret-at-least-thirty-two-characters",
    "company-enrichment.realtime.enabled=false",
    "company-data.startup-sync.enabled=false",
    "company-data.batch-sync.enabled=false"
})
@AutoConfigureMockMvc
class FreshMysqlStartupTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired Flyway flyway;
    @Autowired JdbcTemplate jdbc;

    @Test
    void migratesEmptyDatabaseAndPersistsLoginSession() throws Exception {
        assertThat(flyway.info().pending()).isEmpty();
        assertThat(jdbc.queryForObject(
            "SELECT COUNT(*) FROM flyway_schema_history WHERE version = '1' AND success = 1",
            Integer.class)).isEqualTo(1);

        String email = "smoke-" + UUID.randomUUID() + "@example.com";
        String password = "ci-only-password";
        mvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON)
            .content(json.writeValueAsString(Map.of("email", email, "password", password, "name", "CI"))))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data.accessToken").isNotEmpty());
        String body = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
            .content(json.writeValueAsString(Map.of("email", email, "password", password))))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String token = json.readTree(body).path("data").path("accessToken").asText();
        mvc.perform(get("/api/me").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data.email").value(email));
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
            .content(json.writeValueAsString(Map.of("email", email, "password", "wrong-password"))))
            .andExpect(status().isUnauthorized());
    }
}
