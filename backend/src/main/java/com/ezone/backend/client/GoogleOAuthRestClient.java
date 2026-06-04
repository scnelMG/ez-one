package com.ezone.backend.client;

import com.ezone.backend.dto.auth.GoogleLoginRequest;
import com.ezone.backend.dto.auth.GoogleUserProfile;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

@Component
@Primary
public class GoogleOAuthRestClient implements GoogleOAuthClient {

    private final RestClient restClient;
    private final String clientId;
    private final String clientSecret;
    private final String tokenUri;
    private final String userInfoUri;

    @Autowired
    public GoogleOAuthRestClient(
        RestClient.Builder restClientBuilder,
        @Value("${auth.google.client-id}") String clientId,
        @Value("${auth.google.client-secret}") String clientSecret,
        @Value("${auth.google.token-uri}") String tokenUri,
        @Value("${auth.google.user-info-uri}") String userInfoUri
    ) {
        this(restClientBuilder.build(), clientId, clientSecret, tokenUri, userInfoUri);
    }

    GoogleOAuthRestClient(
        RestClient restClient,
        String clientId,
        String clientSecret,
        String tokenUri,
        String userInfoUri
    ) {
        this.restClient = restClient;
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.tokenUri = tokenUri;
        this.userInfoUri = userInfoUri;
    }

    @Override
    public GoogleUserProfile verifyAuthorizationCode(GoogleLoginRequest request) {
        GoogleTokenResponse token = exchangeAuthorizationCode(request);
        GoogleUserInfoResponse userInfo = loadUserInfo(token.accessToken());

        return new GoogleUserProfile(
            userInfo.sub(),
            userInfo.email(),
            userInfo.name(),
            userInfo.givenName() == null || userInfo.givenName().isBlank()
                ? userInfo.name()
                : userInfo.givenName()
        );
    }

    private GoogleTokenResponse exchangeAuthorizationCode(GoogleLoginRequest request) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("code", request.authorizationCode());
        form.add("client_id", clientId);
        form.add("client_secret", clientSecret);
        form.add("redirect_uri", request.redirectUri());
        form.add("grant_type", "authorization_code");

        return restClient.post()
            .uri(tokenUri)
            .contentType(MediaType.APPLICATION_FORM_URLENCODED)
            .body(form)
            .retrieve()
            .body(GoogleTokenResponse.class);
    }

    private GoogleUserInfoResponse loadUserInfo(String accessToken) {
        return restClient.get()
            .uri(userInfoUri)
            .headers(headers -> headers.setBearerAuth(accessToken))
            .retrieve()
            .body(GoogleUserInfoResponse.class);
    }

    record GoogleTokenResponse(
        @com.fasterxml.jackson.annotation.JsonProperty("access_token") String accessToken,
        @com.fasterxml.jackson.annotation.JsonProperty("token_type") String tokenType,
        @com.fasterxml.jackson.annotation.JsonProperty("expires_in") long expiresIn
    ) {
    }

    record GoogleUserInfoResponse(
        String sub,
        String email,
        String name,
        @com.fasterxml.jackson.annotation.JsonProperty("given_name") String givenName
    ) {
    }
}
