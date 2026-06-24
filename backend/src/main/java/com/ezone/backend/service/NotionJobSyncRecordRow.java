package com.ezone.backend.service;

public record NotionJobSyncRecordRow(
    Long basketJobId,
    Long userId,
    String notionPageId
) {
}
