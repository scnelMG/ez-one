package com.ezone.backend.dto.mattermost;

public record MattermostJobCandidateResponse(
    Long id,
    String companyName,
    String title,
    String url,
    String deadlineLabel,
    String reviewStatus,
    Long promotedJobId
) {
}
