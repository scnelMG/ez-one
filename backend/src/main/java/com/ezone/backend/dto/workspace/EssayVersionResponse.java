package com.ezone.backend.dto.workspace;

public record EssayVersionResponse(
    Long id,
    Long questionId,
    String versionName,
    String body
) {
}
