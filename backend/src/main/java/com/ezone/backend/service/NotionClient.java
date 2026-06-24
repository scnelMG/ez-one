package com.ezone.backend.service;

public interface NotionClient {

    NotionOAuthToken exchangeAuthorizationCode(String authorizationCode, String redirectUri);

    NotionDatabaseResult createJobsDatabase(String accessToken);

    void ensureJobsRootPageTitle(String accessToken, String rootPageId);

    void ensureJobsDatabaseSchema(String accessToken, String databaseId);

    NotionPageResult createJobPage(String accessToken, String dataSourceId, NotionJobPageRequest request);

    NotionPageResult updateJobPage(String accessToken, String pageId, NotionJobPageRequest request);
}
