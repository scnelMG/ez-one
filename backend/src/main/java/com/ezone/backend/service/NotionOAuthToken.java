package com.ezone.backend.service;

public record NotionOAuthToken(
    String accessToken,
    String workspaceId,
    String botId,
    String ownerEmail
) {
}
