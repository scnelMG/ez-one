package com.ezone.backend.service;

import com.ezone.backend.client.GoogleOAuthClient;
import com.ezone.backend.domain.UserAccount;
import com.ezone.backend.dto.auth.AuthTokenResponse;
import com.ezone.backend.dto.auth.CurrentUserResponse;
import com.ezone.backend.dto.auth.GoogleLoginRequest;
import com.ezone.backend.dto.auth.GoogleUserProfile;
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
}
