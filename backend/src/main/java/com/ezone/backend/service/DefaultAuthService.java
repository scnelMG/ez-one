package com.ezone.backend.service;

import com.ezone.backend.client.GoogleOAuthClient;
import com.ezone.backend.domain.UserAccount;
import com.ezone.backend.dto.auth.AuthTokenResponse;
import com.ezone.backend.dto.auth.CurrentUserResponse;
import com.ezone.backend.dto.auth.GoogleLoginRequest;
import com.ezone.backend.dto.auth.GoogleUserProfile;
import com.ezone.backend.dto.auth.RefreshTokenRequest;
import com.ezone.backend.mapper.UserAccountMapper;
import com.ezone.backend.security.AuthTokenIssuer;
import com.ezone.backend.security.IssuedTokenPair;
import org.springframework.stereotype.Service;

@Service
public class DefaultAuthService implements AuthService {

    private final GoogleOAuthClient googleOAuthClient;
    private final UserAccountMapper userAccountMapper;
    private final AuthTokenIssuer authTokenIssuer;

    public DefaultAuthService(
        GoogleOAuthClient googleOAuthClient,
        UserAccountMapper userAccountMapper,
        AuthTokenIssuer authTokenIssuer
    ) {
        this.googleOAuthClient = googleOAuthClient;
        this.userAccountMapper = userAccountMapper;
        this.authTokenIssuer = authTokenIssuer;
    }

    @Override
    public AuthTokenResponse loginWithGoogle(GoogleLoginRequest request) {
        GoogleUserProfile profile = googleOAuthClient.verifyAuthorizationCode(request);
        UserAccount user = userAccountMapper.findByGoogleSubject(profile.subject())
            .orElseGet(() -> userAccountMapper.createFromGoogleProfile(profile));
        IssuedTokenPair tokens = authTokenIssuer.issueFor(user);

        return new AuthTokenResponse(
            tokens.accessToken(),
            tokens.refreshToken(),
            "Bearer",
            tokens.expiresIn(),
            new CurrentUserResponse(
                user.id(),
                user.email(),
                user.name(),
                user.nickname(),
                user.profileCompleted()
            )
        );
    }

    @Override
    public AuthTokenResponse refresh(RefreshTokenRequest request) {
        IssuedTokenPair tokens = authTokenIssuer.refresh(request.refreshToken());
        UserAccount user = userAccountMapper.findById(extractUserId(tokens.accessToken()))
            .orElseThrow(() -> new IllegalStateException("Issued access token user could not be loaded."));

        return toAuthTokenResponse(tokens, user);
    }

    @Override
    public void logout(RefreshTokenRequest request) {
        authTokenIssuer.revoke(request.refreshToken());
    }

    private AuthTokenResponse toAuthTokenResponse(IssuedTokenPair tokens, UserAccount user) {
        return new AuthTokenResponse(
            tokens.accessToken(),
            tokens.refreshToken(),
            "Bearer",
            tokens.expiresIn(),
            new CurrentUserResponse(
                user.id(),
                user.email(),
                user.name(),
                user.nickname(),
                user.profileCompleted()
            )
        );
    }

    private Long extractUserId(String accessToken) {
        try {
            String payload = accessToken.split("\\.")[1];
            String json = new String(java.util.Base64.getUrlDecoder().decode(payload), java.nio.charset.StandardCharsets.UTF_8);
            int start = json.indexOf("\"sub\":\"") + "\"sub\":\"".length();
            int end = json.indexOf("\"", start);
            return Long.valueOf(json.substring(start, end));
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to read issued access token user id.", exception);
        }
    }
}
