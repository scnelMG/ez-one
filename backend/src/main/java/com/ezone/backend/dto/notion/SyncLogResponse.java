package com.ezone.backend.dto.notion;

public record SyncLogResponse(
    Long id,
    String target,
    String status,
    String message
) {
}
