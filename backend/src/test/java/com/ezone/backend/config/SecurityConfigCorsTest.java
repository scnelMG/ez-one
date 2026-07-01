package com.ezone.backend.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;

class SecurityConfigCorsTest {

    private final SecurityConfig securityConfig = new SecurityConfig(null, new ObjectMapper());

    @Test
    void corsUsesExactAllowedOriginsOnly() {
        CorsConfigurationSource source = securityConfig.corsConfigurationSource(
            "http://localhost:5173,chrome-extension://ikpeibohnopmikegoogggmdipmhmiadi"
        );

        CorsConfiguration configuration = source.getCorsConfiguration(new MockHttpServletRequest("GET", "/api/me"));

        assertThat(configuration).isNotNull();
        assertThat(configuration.getAllowedOrigins()).containsExactly(
            "http://localhost:5173",
            "chrome-extension://ikpeibohnopmikegoogggmdipmhmiadi"
        );
        assertThat(configuration.getAllowedOriginPatterns()).isNullOrEmpty();
        assertThat(configuration.getAllowCredentials()).isTrue();
    }

    @Test
    void corsRejectsWildcardOriginsBecauseCredentialsAreAllowed() {
        assertThatThrownBy(() -> securityConfig.corsConfigurationSource("http://localhost:5173,chrome-extension://*"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Wildcard CORS origins");
    }
}
