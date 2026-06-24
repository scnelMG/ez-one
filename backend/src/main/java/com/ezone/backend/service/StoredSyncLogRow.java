package com.ezone.backend.service;

import com.ezone.backend.domain.SyncScope;

public record StoredSyncLogRow(
    Long id,
    Long userId,
    Long basketJobId,
    SyncScope syncScope,
    String target,
    String status,
    String message,
    String notionPageId
) {
}
