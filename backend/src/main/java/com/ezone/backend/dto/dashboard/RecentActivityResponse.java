package com.ezone.backend.dto.dashboard;

public record RecentActivityResponse(
    Long workspaceId,
    String companyName,
    String positionTitle,
    String actionName,
    String updatedAt
) {}
