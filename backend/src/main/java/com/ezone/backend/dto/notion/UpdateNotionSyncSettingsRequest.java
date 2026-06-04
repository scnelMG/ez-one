package com.ezone.backend.dto.notion;

import com.ezone.backend.domain.SyncScope;
import jakarta.validation.constraints.NotNull;

public record UpdateNotionSyncSettingsRequest(
    boolean syncEnabled,
    @NotNull SyncScope syncScope
) {
}
