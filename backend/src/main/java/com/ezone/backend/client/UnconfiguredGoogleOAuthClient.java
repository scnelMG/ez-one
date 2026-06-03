package com.ezone.backend.client;

import com.ezone.backend.dto.auth.GoogleLoginRequest;
import com.ezone.backend.dto.auth.GoogleUserProfile;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnMissingBean(GoogleOAuthClient.class)
public class UnconfiguredGoogleOAuthClient implements GoogleOAuthClient {

    @Override
    public GoogleUserProfile verifyAuthorizationCode(GoogleLoginRequest request) {
        throw new IllegalStateException("Google OAuth client is not configured yet.");
    }
}
