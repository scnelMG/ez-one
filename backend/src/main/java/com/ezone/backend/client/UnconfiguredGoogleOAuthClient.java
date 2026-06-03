package com.ezone.backend.client;

import com.ezone.backend.dto.auth.GoogleLoginRequest;
import com.ezone.backend.dto.auth.GoogleUserProfile;
import org.springframework.stereotype.Component;

@Component
public class UnconfiguredGoogleOAuthClient implements GoogleOAuthClient {

    @Override
    public GoogleUserProfile verifyAuthorizationCode(GoogleLoginRequest request) {
        throw new IllegalStateException("Google OAuth client is not configured yet.");
    }
}
