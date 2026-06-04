package com.ezone.backend.dto.workspace;

import java.util.Map;

public record WorkspaceDefaultsResponse(
    Long workspaceId,
    Map<String, Object> sections
) {
}
