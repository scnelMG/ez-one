package com.ezone.backend.dto.auth;

import jakarta.validation.constraints.NotBlank;

public record GoogleLoginRequest(
    @NotBlank String authorizationCode,
    @NotBlank String redirectUri
) {
}
