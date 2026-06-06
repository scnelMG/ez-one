package com.ezone.backend.dto.extension;

public record ExtensionJobPreviewRequest(
    String companyName,
    String positionTitle,
    String deadlineLabel,
    String sourceUrl,
    String logoUrl
) {
}
