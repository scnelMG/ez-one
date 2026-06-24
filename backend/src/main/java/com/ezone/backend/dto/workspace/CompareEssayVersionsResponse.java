package com.ezone.backend.dto.workspace;

public record CompareEssayVersionsResponse(
    Long leftVersionId,
    Long rightVersionId,
    String leftVersionName,
    String rightVersionName,
    String questionPrompt,
    String leftBody,
    String rightBody,
    boolean changed,
    String aiSummary
) {
}
