package com.ezone.backend.service;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "notion")
public record NotionProperties(
    String clientId,
    String clientSecret,
    String authorizationUri,
    String tokenUri,
    String pagesUri,
    String databasesUri,
    String version,
    String tokenEncryptionKey
) {
    public String resolvedAuthorizationUri() {
        return authorizationUri == null || authorizationUri.isBlank()
            ? "https://api.notion.com/v1/oauth/authorize"
            : authorizationUri;
    }

    public String resolvedTokenUri() {
        return tokenUri == null || tokenUri.isBlank()
            ? "https://api.notion.com/v1/oauth/token"
            : tokenUri;
    }

    public String resolvedPagesUri() {
        return pagesUri == null || pagesUri.isBlank()
            ? "https://api.notion.com/v1/pages"
            : pagesUri;
    }

    public String resolvedDatabasesUri() {
        return databasesUri == null || databasesUri.isBlank()
            ? "https://api.notion.com/v1/databases"
            : databasesUri;
    }

    public String resolvedVersion() {
        return version == null || version.isBlank()
            ? "2022-06-28"
            : version;
    }
}
