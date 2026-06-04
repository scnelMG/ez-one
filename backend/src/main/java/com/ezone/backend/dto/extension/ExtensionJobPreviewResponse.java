package com.ezone.backend.dto.extension;

public record ExtensionJobPreviewResponse(
    boolean saveable,
    String companyName,
    String positionTitle,
    String deadlineLabel,
    String sourceUrl,
    String message
) {
}
