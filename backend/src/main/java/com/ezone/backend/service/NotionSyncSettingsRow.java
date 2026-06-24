package com.ezone.backend.service;

import com.ezone.backend.domain.SyncScope;

public record NotionSyncSettingsRow(
    Long userId,
    String databaseId,
    String dataSourceId,
    String rootPageId,
    SyncScope syncScope,
    boolean enabled
) {
}
