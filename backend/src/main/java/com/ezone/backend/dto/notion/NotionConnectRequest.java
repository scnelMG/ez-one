package com.ezone.backend.dto.notion;

public record NotionConnectRequest(
    String authorizationCode,
    String redirectUri
) {
}
