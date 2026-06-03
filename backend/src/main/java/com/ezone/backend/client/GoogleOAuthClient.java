package com.ezone.backend.client;

import com.ezone.backend.dto.auth.GoogleLoginRequest;
import com.ezone.backend.dto.auth.GoogleUserProfile;

public interface GoogleOAuthClient {
    GoogleUserProfile verifyAuthorizationCode(GoogleLoginRequest request);
}
