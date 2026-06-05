package com.ezone.backend.service;

import com.ezone.backend.dto.auth.AuthTokenResponse;
import com.ezone.backend.dto.auth.EmailLoginRequest;
import com.ezone.backend.dto.auth.GoogleLoginRequest;
import com.ezone.backend.dto.auth.RefreshTokenRequest;
import com.ezone.backend.dto.auth.SignupRequest;

public interface AuthService {
    AuthTokenResponse signup(SignupRequest request);

    AuthTokenResponse loginWithEmail(EmailLoginRequest request);

    AuthTokenResponse loginWithGoogle(GoogleLoginRequest request);

    AuthTokenResponse refresh(RefreshTokenRequest request);

    void logout(RefreshTokenRequest request);
}
