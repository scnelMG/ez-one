package com.ezone.backend.dto.auth;

public record AuthTokenResponse(
    String accessToken,
    String refreshToken,
    String tokenType,
    long expiresIn,
    CurrentUserResponse user
) {
}
