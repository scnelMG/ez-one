package com.ezone.backend.dto.notion;

import com.ezone.backend.domain.SyncScope;

public record NotionConnectionResponse(
    boolean connected,
    String notionAccountEmail,
    boolean syncEnabled,
    SyncScope syncScope
) {
}
