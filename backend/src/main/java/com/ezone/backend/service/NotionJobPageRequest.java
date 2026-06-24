package com.ezone.backend.service;

import com.ezone.backend.domain.SyncScope;

public record NotionJobPageRequest(
    Long basketJobId,
    Long workspaceId,
    String companyName,
    String positionTitle,
    String applicationStatus,
    String statusLabel,
    String deadlineLabel,
    String deadlineDate,
    boolean deadlineSoon,
    String companyLogoUrl,
    String sourceUrl,
    String applicationMemo,
    SyncScope syncScope
) {
}
