package com.ezone.backend.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateCurrentUserRequest(
    @NotBlank
    @Size(max = 50)
    String nickname
) {
}
