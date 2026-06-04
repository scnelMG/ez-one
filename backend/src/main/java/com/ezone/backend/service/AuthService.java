package com.ezone.backend.service;

import com.ezone.backend.dto.auth.AuthTokenResponse;
import com.ezone.backend.dto.auth.GoogleLoginRequest;
import com.ezone.backend.dto.auth.RefreshTokenRequest;

public interface AuthService {
    AuthTokenResponse loginWithGoogle(GoogleLoginRequest request);

    AuthTokenResponse refresh(RefreshTokenRequest request);

    void logout(RefreshTokenRequest request);
}
