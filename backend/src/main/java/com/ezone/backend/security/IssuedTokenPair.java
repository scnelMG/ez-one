package com.ezone.backend.security;

public record IssuedTokenPair(
    String accessToken,
    String refreshToken,
    long expiresIn
) {
}
