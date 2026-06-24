package com.ezone.backend.service;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.UriComponentsBuilder;

@Service
@EnableConfigurationProperties(NotionProperties.class)
public class NotionOAuthUrlService {

    private final NotionProperties properties;

    public NotionOAuthUrlService(NotionProperties properties) {
        this.properties = properties;
    }

    public String buildAuthorizationUrl(String redirectUri, String state) {
        if (properties.clientId() == null || properties.clientId().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Notion OAuth client ID is not configured.");
        }
        if (redirectUri == null || redirectUri.isBlank() || state == null || state.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Notion OAuth redirect URI and state are required.");
        }
        return UriComponentsBuilder.fromUriString(properties.resolvedAuthorizationUri())
            .queryParam("client_id", properties.clientId())
            .queryParam("redirect_uri", redirectUri)
            .queryParam("response_type", "code")
            .queryParam("owner", "user")
            .queryParam("state", state)
            .build()
            .toUriString();
    }
}
