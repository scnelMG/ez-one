package com.ezone.backend.service;

public record NotionConnectionRow(
    Long userId,
    String workspaceId,
    String accessTokenCiphertext,
    String botId,
    String notionAccountEmail
) {
}
