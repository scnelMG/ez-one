package com.ezone.backend.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.DefaultCorsProcessor;

class SecurityConfigCorsTest {

    private static final String PRODUCTION_WEB_ORIGIN = "https://ez-one.o-r.kr";
    private static final String PRODUCTION_EXTENSION_ORIGIN =
        "chrome-extension://oamnhdoaefndncadifgaidefcjaomgdo";
    private static final String UNCONFIGURED_EXTENSION_ORIGIN =
        "chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

    private final SecurityConfig securityConfig = new SecurityConfig(null, new ObjectMapper());

    @Test
    void corsUsesExactAllowedOriginsOnly() {
        CorsConfigurationSource source = securityConfig.corsConfigurationSource(
            PRODUCTION_WEB_ORIGIN + "," + PRODUCTION_EXTENSION_ORIGIN
        );

        CorsConfiguration configuration = source.getCorsConfiguration(new MockHttpServletRequest("GET", "/api/me"));

        assertThat(configuration).isNotNull();
        assertThat(configuration.getAllowedOrigins()).containsExactly(
            PRODUCTION_WEB_ORIGIN,
            PRODUCTION_EXTENSION_ORIGIN
        );
        assertThat(configuration.getAllowedOriginPatterns()).isNullOrEmpty();
        assertThat(configuration.getAllowCredentials()).isTrue();
    }

    @Test
    void allowsConfiguredChromeExtensionOriginForCredentials() throws Exception {
        CorsConfigurationSource source = securityConfig.corsConfigurationSource(
            PRODUCTION_WEB_ORIGIN + "," + PRODUCTION_EXTENSION_ORIGIN
        );
        MockHttpServletRequest request = new MockHttpServletRequest("OPTIONS", "/api/extension/jobs/save");
        request.addHeader("Origin", PRODUCTION_EXTENSION_ORIGIN);
        request.addHeader("Access-Control-Request-Method", "POST");
        MockHttpServletResponse response = new MockHttpServletResponse();

        CorsConfiguration configuration = source.getCorsConfiguration(request);
        boolean accepted = new DefaultCorsProcessor().processRequest(configuration, request, response);

        assertThat(accepted).isTrue();
        assertThat(response.getHeader("Access-Control-Allow-Origin")).isEqualTo(PRODUCTION_EXTENSION_ORIGIN);
        assertThat(response.getHeader("Access-Control-Allow-Credentials")).isEqualTo("true");
    }

    @Test
    void rejectsUnconfiguredChromeExtensionOrigin() throws Exception {
        CorsConfigurationSource source = securityConfig.corsConfigurationSource(PRODUCTION_WEB_ORIGIN);
        MockHttpServletRequest request = new MockHttpServletRequest("OPTIONS", "/api/extension/jobs/save");
        request.addHeader("Origin", UNCONFIGURED_EXTENSION_ORIGIN);
        request.addHeader("Access-Control-Request-Method", "POST");
        MockHttpServletResponse response = new MockHttpServletResponse();

        CorsConfiguration configuration = source.getCorsConfiguration(request);
        boolean accepted = new DefaultCorsProcessor().processRequest(configuration, request, response);

        assertThat(accepted).isFalse();
        assertThat(response.getHeader("Access-Control-Allow-Origin")).isNull();
    }

    @Test
    void corsRejectsWildcardOriginsBecauseCredentialsAreAllowed() {
        assertThatThrownBy(() -> securityConfig.corsConfigurationSource("http://localhost:5173,chrome-extension://*"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Wildcard CORS origins");
    }
}
