package com.ezone.backend.dto.dart;

public record DartAnalysisResponse(
    Long id,
    Long workspaceId,
    String rceptNo,
    String reportName,
    String companyName,
    String status,
    String model,
    String sourceUrl,
    DartAnalysisContentResponse result,
    String errorMessage
) {
}
