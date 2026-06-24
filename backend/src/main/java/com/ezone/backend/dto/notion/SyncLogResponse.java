package com.ezone.backend.dto.notion;

public record SyncLogResponse(
    Long id,
    Long basketJobId,
    String target,
    String status,
    String message
) {
}
