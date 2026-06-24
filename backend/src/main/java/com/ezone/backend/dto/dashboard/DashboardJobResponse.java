package com.ezone.backend.dto.dashboard;

public record DashboardJobResponse(
    Long basketJobId,
    Long workspaceId,
    String companyName,
    String positionTitle,
    String deadlineLabel,
    String companyLogoUrl,
    String companyDomain,
    String companyType,
    String sourceUrl,
    Integer recommendationScore,
    String recommendationReason,
    String recommendationStatus,
    String postedAt,
    String collectedAt
) {
    public DashboardJobResponse(
        Long basketJobId,
        Long workspaceId,
        String companyName,
        String positionTitle,
        String deadlineLabel,
        String companyLogoUrl,
        String sourceUrl
    ) {
        this(basketJobId, workspaceId, companyName, positionTitle, deadlineLabel, companyLogoUrl, null, null, sourceUrl, null, null, null, null, null);
    }

    public DashboardJobResponse(
        Long basketJobId,
        Long workspaceId,
        String companyName,
        String positionTitle,
        String deadlineLabel,
        String companyLogoUrl,
        String sourceUrl,
        Integer recommendationScore,
        String recommendationReason
    ) {
        this(
            basketJobId,
            workspaceId,
            companyName,
            positionTitle,
            deadlineLabel,
            companyLogoUrl,
            null,
            null,
            sourceUrl,
            recommendationScore,
            recommendationReason,
            null,
            null,
            null
        );
    }

    public DashboardJobResponse(
        Long basketJobId,
        Long workspaceId,
        String companyName,
        String positionTitle,
        String deadlineLabel,
        String companyLogoUrl,
        String sourceUrl,
        Integer recommendationScore,
        String recommendationReason,
        String collectedAt
    ) {
        this(
            basketJobId,
            workspaceId,
            companyName,
            positionTitle,
            deadlineLabel,
            companyLogoUrl,
            null,
            null,
            sourceUrl,
            recommendationScore,
            recommendationReason,
            null,
            null,
            collectedAt
        );
    }
}
