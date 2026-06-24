package com.ezone.backend.dto.workspace;

import jakarta.validation.constraints.NotNull;

public record CompareEssayVersionsRequest(
    @NotNull Long leftVersionId,
    @NotNull Long rightVersionId
) {
}
