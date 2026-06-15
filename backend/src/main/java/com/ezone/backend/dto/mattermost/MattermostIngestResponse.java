package com.ezone.backend.dto.mattermost;

public record MattermostIngestResponse(
    Long messageId,
    String messageType,
    String parseStatus,
    boolean createdParsedJobPost,
    Long parsedJobPostId
) {
}
