package com.ezone.backend.dto.dashboard;

public record DashboardJobResponse(
    Long basketJobId,
    Long workspaceId,
    String companyName,
    String positionTitle,
    String deadlineLabel,
    String companyLogoUrl
) {
}
