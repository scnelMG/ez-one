package com.ezone.backend.dto.workspace;

import jakarta.validation.constraints.NotNull;

public record UpdateDraftRequest(
    @NotNull String body
) {
}
