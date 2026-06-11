package com.ezone.backend.dto.basket;

import com.ezone.backend.domain.ApplicationStatus;

public record BasketJobResponse(
    Long id,
    Long workspaceId,
    String companyName,
    String positionTitle,
    ApplicationStatus applicationStatus,
    String statusLabel,
    String deadlineLabel,
    String deadlineDate,
    boolean deadlineSoon,
    String companyLogoUrl,
    String sourceUrl,
    String applicationMemo
) {
}
