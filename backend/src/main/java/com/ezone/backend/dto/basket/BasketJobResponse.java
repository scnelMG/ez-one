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
    boolean deadlineSoon,
    String sourceUrl,
    String applicationMemo
) {
}
