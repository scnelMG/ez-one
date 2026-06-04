package com.ezone.backend.client;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withUnauthorizedRequest;

import com.ezone.backend.dto.auth.GoogleLoginRequest;
import com.ezone.backend.dto.auth.GoogleUserProfile;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class GoogleOAuthRestClientTest {

    @Test
    void verifyAuthorizationCodeExchangesCodeAndLoadsGoogleProfile() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        GoogleOAuthRestClient client = new GoogleOAuthRestClient(
            builder.build(),
            "google-client-id",
            "google-client-secret",
            "https://oauth2.googleapis.com/token",
            "https://www.googleapis.com/oauth2/v3/userinfo"
        );

        server.expect(once(), requestTo("https://oauth2.googleapis.com/token"))
            .andExpect(method(HttpMethod.POST))
            .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_FORM_URLENCODED))
            .andExpect(content().string(containsString("code=google-oauth-code")))
            .andExpect(content().string(containsString("client_id=google-client-id")))
            .andRespond(withSuccess("""
                {
                  "access_token": "google-access-token",
                  "token_type": "Bearer",
                  "expires_in": 3600
                }
                """, MediaType.APPLICATION_JSON));

        server.expect(once(), requestTo("https://www.googleapis.com/oauth2/v3/userinfo"))
            .andExpect(method(HttpMethod.GET))
            .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer google-access-token"))
            .andRespond(withSuccess("""
                {
                  "sub": "google-subject",
                  "email": "user@example.com",
                  "name": "Hong Gil Dong",
                  "given_name": "Gil Dong"
                }
                """, MediaType.APPLICATION_JSON));

        GoogleUserProfile profile = client.verifyAuthorizationCode(new GoogleLoginRequest(
            "google-oauth-code",
            "http://localhost:5173/login/callback"
        ));

        assertThat(profile.subject()).isEqualTo("google-subject");
        assertThat(profile.email()).isEqualTo("user@example.com");
        assertThat(profile.name()).isEqualTo("Hong Gil Dong");
        assertThat(profile.nickname()).isEqualTo("Gil Dong");
        server.verify();
    }

    @Test
    void verifyAuthorizationCodeWrapsGoogleTokenExchangeFailure() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        GoogleOAuthRestClient client = new GoogleOAuthRestClient(
            builder.build(),
            "google-client-id",
            "google-client-secret",
            "https://oauth2.googleapis.com/token",
            "https://www.googleapis.com/oauth2/v3/userinfo"
        );

        server.expect(once(), requestTo("https://oauth2.googleapis.com/token"))
            .andRespond(withUnauthorizedRequest());

        assertThatThrownBy(() -> client.verifyAuthorizationCode(new GoogleLoginRequest(
            "google-oauth-code",
            "http://localhost:5173/login/callback"
        )))
            .isInstanceOf(GoogleOAuthException.class)
            .hasMessage("Google 인증 코드 교환에 실패했습니다. 다시 로그인해 주세요.");

        server.verify();
    }
}
