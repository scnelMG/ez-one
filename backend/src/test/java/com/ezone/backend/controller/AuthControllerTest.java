package com.ezone.backend.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.ezone.backend.client.GoogleOAuthException;
import com.ezone.backend.config.SecurityConfig;
import com.ezone.backend.dto.auth.AuthTokenResponse;
import com.ezone.backend.dto.auth.CurrentUserResponse;
import com.ezone.backend.security.JwtAccessTokenVerifier;
import com.ezone.backend.security.JwtAuthenticationFilter;
import com.ezone.backend.service.AuthService;
import org.hamcrest.Matchers;
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
    void googleLoginAllowsFrontendCorsPreflight() throws Exception {
        mockMvc.perform(options("/api/auth/google")
                .header("Origin", "http://localhost:5173")
                .header("Access-Control-Request-Method", "POST")
                .header("Access-Control-Request-Headers", "content-type"))
            .andExpect(status().isOk())
            .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"))
            .andExpect(header().string("Access-Control-Allow-Methods", Matchers.containsString("POST")));
    }

    @Test
    void extensionApiAllowsLocalChromeExtensionCorsPreflight() throws Exception {
        mockMvc.perform(options("/api/extension/jobs/save")
                .header("Origin", "chrome-extension://ikpeibohnopmikegoogggmdipmhmiadi")
                .header("Access-Control-Request-Method", "POST")
                .header("Access-Control-Request-Headers", "authorization,content-type"))
            .andExpect(status().isOk())
            .andExpect(header().string(
                "Access-Control-Allow-Origin",
                "chrome-extension://ikpeibohnopmikegoogggmdipmhmiadi"
            ))
            .andExpect(header().string("Access-Control-Allow-Methods", Matchers.containsString("POST")));
    }

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
                    "Hong Gil Dong",
                    "Gil Dong",
                    false,
                    true
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
            .andExpect(jsonPath("$.data.user.onboardingRequired").value(true))
            .andExpect(jsonPath("$.error").doesNotExist());
    }

    @Test
    void signupReturnsTokenEnvelope() throws Exception {
        when(authService.signup(any())).thenReturn(
            new AuthTokenResponse(
                "access-token",
                "refresh-token",
                "Bearer",
                3600,
                new CurrentUserResponse(
                    2L,
                    "local@example.com",
                    "Local User",
                    "Local User",
                    false,
                    true
                )
            )
        );

        mockMvc.perform(post("/api/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "email": "local@example.com",
                      "password": "password123!",
                      "name": "Local User"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.accessToken").value("access-token"))
            .andExpect(jsonPath("$.data.refreshToken").value("refresh-token"))
            .andExpect(jsonPath("$.data.user.email").value("local@example.com"))
            .andExpect(jsonPath("$.data.user.profileCompleted").value(false))
            .andExpect(jsonPath("$.data.user.onboardingRequired").value(true));
    }

    @Test
    void emailLoginReturnsTokenEnvelope() throws Exception {
        when(authService.loginWithEmail(any())).thenReturn(
            new AuthTokenResponse(
                "access-token",
                "refresh-token",
                "Bearer",
                3600,
                new CurrentUserResponse(
                    2L,
                    "local@example.com",
                    "Local User",
                    "Local User",
                    true,
                    false
                )
            )
        );

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "email": "local@example.com",
                      "password": "password123!"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.accessToken").value("access-token"))
            .andExpect(jsonPath("$.data.refreshToken").value("refresh-token"))
            .andExpect(jsonPath("$.data.user.email").value("local@example.com"))
            .andExpect(jsonPath("$.data.user.profileCompleted").value(true))
            .andExpect(jsonPath("$.data.user.onboardingRequired").value(false));
    }

    @Test
    void duplicateEmailSignupReturnsConflictEnvelope() throws Exception {
        doThrow(new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.CONFLICT,
                "Email is already registered."
            ))
            .when(authService)
            .signup(any());

        mockMvc.perform(post("/api/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "email": "local@example.com",
                      "password": "password123!",
                      "name": "Local User"
                    }
                    """))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.error.code").value("CONFLICT"))
            .andExpect(jsonPath("$.error.message").value("Email is already registered."));
    }

    @Test
    void googleLoginFailureReturnsApiEnvelope() throws Exception {
        doThrow(new GoogleOAuthException("Google 인증 코드 교환에 실패했습니다. 다시 로그인해 주세요.", null))
            .when(authService)
            .loginWithGoogle(any());

        mockMvc.perform(post("/api/auth/google")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "authorizationCode": "google-oauth-code",
                      "redirectUri": "http://localhost:5173/login/callback"
                    }
                    """))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.error.code").value("OAUTH_FAILED"))
            .andExpect(jsonPath("$.error.message").value("Google 인증 코드 교환에 실패했습니다. 다시 로그인해 주세요."));
    }

    @Test
    void refreshAndLogoutReturnApiEnvelope() throws Exception {
        when(authService.refresh(any())).thenReturn(
            new AuthTokenResponse(
                "new-access-token",
                "new-refresh-token",
                "Bearer",
                1800,
                new CurrentUserResponse(
                    1L,
                    "user@example.com",
                    "Hong Gil Dong",
                    "Gil Dong",
                    false,
                    false
                )
            )
        );

        mockMvc.perform(post("/api/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    { "refreshToken": "refresh-token" }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.accessToken").value("new-access-token"))
            .andExpect(jsonPath("$.data.refreshToken").value("new-refresh-token"))
            .andExpect(jsonPath("$.data.tokenType").value("Bearer"));

        mockMvc.perform(post("/api/auth/logout")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    { "refreshToken": "refresh-token" }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.revoked").value(true));
    }

    @Test
    void extensionSessionIssuesSeparateTokenEnvelopeForAuthenticatedUser() throws Exception {
        when(authService.issueExtensionSession(1L)).thenReturn(
            new AuthTokenResponse(
                "extension-access-token",
                "extension-refresh-token",
                "Bearer",
                1800,
                new CurrentUserResponse(
                    1L,
                    "user@example.com",
                    "Hong Gil Dong",
                    "Gil Dong",
                    true,
                    false
                )
            )
        );

        mockMvc.perform(post("/api/auth/extension-session").with(user("1")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.accessToken").value("extension-access-token"))
            .andExpect(jsonPath("$.data.refreshToken").value("extension-refresh-token"));
    }
}
