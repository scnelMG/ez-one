package com.ezone.backend.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.ezone.backend.config.SecurityConfig;
import com.ezone.backend.dto.auth.AuthTokenResponse;
import com.ezone.backend.dto.auth.CurrentUserResponse;
import com.ezone.backend.security.JwtAccessTokenVerifier;
import com.ezone.backend.security.JwtAuthenticationFilter;
import com.ezone.backend.service.AuthService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(AuthController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, JwtAccessTokenVerifier.class})
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AuthService authService;

    @Test
    void googleLoginReturnsTokenEnvelope() throws Exception {
        when(authService.loginWithGoogle(any())).thenReturn(
            new AuthTokenResponse(
                "access-token",
                "refresh-token",
                "Bearer",
                3600,
                new CurrentUserResponse(
                    1L,
                    "user@example.com",
                    "홍길동",
                    "길동",
                    false
                )
            )
        );

        mockMvc.perform(post("/api/auth/google")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "authorizationCode": "google-oauth-code",
                      "redirectUri": "http://localhost:5173/login/callback"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.accessToken").value("access-token"))
            .andExpect(jsonPath("$.data.refreshToken").value("refresh-token"))
            .andExpect(jsonPath("$.data.tokenType").value("Bearer"))
            .andExpect(jsonPath("$.data.expiresIn").value(3600))
            .andExpect(jsonPath("$.data.user.email").value("user@example.com"))
            .andExpect(jsonPath("$.data.user.profileCompleted").value(false))
            .andExpect(jsonPath("$.error").doesNotExist());
    }

    @Test
    void refreshAndLogoutReturnApiEnvelope() throws Exception {
        mockMvc.perform(post("/api/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    { "refreshToken": "refresh-token" }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.accessToken").value("dev-access-token"))
            .andExpect(jsonPath("$.data.tokenType").value("Bearer"));

        mockMvc.perform(post("/api/auth/logout")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    { "refreshToken": "refresh-token" }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true));
    }
}
