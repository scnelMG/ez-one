package com.ezone.backend.dto.workspace;

public record CompareEssayVersionsResponse(
    Long leftVersionId,
    Long rightVersionId,
    String leftBody,
    String rightBody,
    boolean changed
) {
}
