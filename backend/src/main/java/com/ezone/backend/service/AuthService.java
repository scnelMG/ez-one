package com.ezone.backend.service;

import com.ezone.backend.dto.auth.AuthTokenResponse;
import com.ezone.backend.dto.auth.GoogleLoginRequest;

public interface AuthService {
    AuthTokenResponse loginWithGoogle(GoogleLoginRequest request);
}
