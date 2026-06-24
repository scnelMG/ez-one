package com.ezone.backend.service;

public record NotionDatabaseResult(
    String rootPageId,
    String databaseId,
    String dataSourceId
) {
}
