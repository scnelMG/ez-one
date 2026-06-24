package com.ezone.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.ExpectedCount.manyTimes;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withBadRequest;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestTemplate;
import org.springframework.test.web.client.MockRestServiceServer;

class RestNotionClientTest {

    @Test
    void exchangesAuthorizationCodeWithNotionVersionHeaderAndServerCredentials() {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        RestNotionClient client = new RestNotionClient(restTemplate, new NotionProperties(
            "notion-client-id",
            "notion-client-secret",
            "https://api.notion.com/v1/oauth/authorize",
            "https://api.notion.com/v1/oauth/token",
            "https://api.notion.com/v1/pages",
            "https://api.notion.com/v1/databases",
            "2022-06-28",
            null
        ));

        server.expect(once(), requestTo("https://api.notion.com/v1/oauth/token"))
            .andExpect(method(HttpMethod.POST))
            .andExpect(header("Notion-Version", "2022-06-28"))
            .andExpect(jsonPath("$.grant_type").value("authorization_code"))
            .andExpect(jsonPath("$.code").value("notion-code"))
            .andExpect(jsonPath("$.redirect_uri").value("http://localhost:5173/mypage/notion"))
            .andRespond(withSuccess("""
                {
                  "access_token": "notion-access-token",
                  "workspace_id": "workspace-1",
                  "bot_id": "bot-1",
                  "owner": {
                    "type": "user",
                    "user": {
                      "name": "Notion User",
                      "person": { "email": "notion@example.com" }
                    }
                  }
                }
                """, MediaType.APPLICATION_JSON));

        NotionOAuthToken token = client.exchangeAuthorizationCode(
            "notion-code",
            "http://localhost:5173/mypage/notion"
        );

        assertThat(token.accessToken()).isEqualTo("notion-access-token");
        assertThat(token.ownerEmail()).isEqualTo("notion@example.com");
        server.verify();
    }

    @Test
    void createsRootPageAndJobsDatabaseWithConfiguredSchema() {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        RestNotionClient client = new RestNotionClient(restTemplate, notionProperties());

        server.expect(once(), requestTo("https://api.notion.com/v1/pages"))
            .andExpect(method(HttpMethod.POST))
            .andExpect(header("Authorization", "Bearer notion-access-token"))
            .andExpect(header("Notion-Version", "2022-06-28"))
            .andExpect(jsonPath("$.parent.type").value("workspace"))
            .andExpect(jsonPath("$.parent.workspace").value(true))
            .andExpect(jsonPath("$.properties.title.title[0].text.content").value("취업 준비"))
            .andRespond(withSuccess("""
                { "id": "root-page-1", "url": "https://notion.so/root-page-1" }
                """, MediaType.APPLICATION_JSON));

        server.expect(once(), requestTo("https://api.notion.com/v1/databases"))
            .andExpect(method(HttpMethod.POST))
            .andExpect(header("Authorization", "Bearer notion-access-token"))
            .andExpect(jsonPath("$.parent.page_id").value("root-page-1"))
            .andExpect(jsonPath("$.title[0].text.content").value("EZ-ONE 공고 장바구니"))
            .andExpect(jsonPath("$.properties['직무'].title").exists())
            .andExpect(jsonPath("$.properties['회사명'].rich_text").exists())
            .andExpect(jsonPath("$.properties['상태'].select.options[0].name").value("지원 전"))
            .andExpect(jsonPath("$.properties['마감일'].date").exists())
            .andExpect(jsonPath("$.properties['마감 임박'].checkbox").exists())
            .andExpect(jsonPath("$.properties['회사 로고'].files").exists())
            .andExpect(jsonPath("$.properties['바로가기'].url").exists())
            .andRespond(withSuccess("""
                {
                  "id": "database-1",
                  "initial_data_source": { "id": "data-source-1" }
                }
                """, MediaType.APPLICATION_JSON));

        NotionDatabaseResult database = client.createJobsDatabase("notion-access-token");

        assertThat(database.rootPageId()).isEqualTo("root-page-1");
        assertThat(database.databaseId()).isEqualTo("database-1");
        assertThat(database.dataSourceId()).isEqualTo("data-source-1");
        server.verify();
    }

    @Test
    void ensuresExistingJobsDatabaseHasFullBasketSchema() {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        RestNotionClient client = new RestNotionClient(restTemplate, notionProperties());

        server.expect(manyTimes(), requestTo("https://api.notion.com/v1/databases/database-1"))
            .andExpect(method(HttpMethod.PATCH))
            .andExpect(header("Authorization", "Bearer notion-access-token"))
            .andRespond(withSuccess("""
                { "id": "database-1" }
                """, MediaType.APPLICATION_JSON));

        client.ensureJobsDatabaseSchema("notion-access-token", "database-1");

        server.verify();
    }

    @Test
    void ensuresExistingRootPageUsesDisplayedTargetLocationName() {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        RestNotionClient client = new RestNotionClient(restTemplate, notionProperties());

        server.expect(once(), requestTo("https://api.notion.com/v1/pages/root-page-1"))
            .andExpect(method(HttpMethod.PATCH))
            .andExpect(header("Authorization", "Bearer notion-access-token"))
            .andExpect(header("Notion-Version", "2022-06-28"))
            .andExpect(jsonPath("$.properties.title.title[0].text.content").value("취업 준비"))
            .andRespond(withSuccess("""
                { "id": "root-page-1" }
                """, MediaType.APPLICATION_JSON));

        client.ensureJobsRootPageTitle("notion-access-token", "root-page-1");

        server.verify();
    }

    @Test
    void createsJobPageInsideJobsDataSource() {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        RestNotionClient client = new RestNotionClient(restTemplate, notionProperties());

        server.expect(once(), requestTo("https://api.notion.com/v1/pages"))
            .andExpect(method(HttpMethod.POST))
            .andExpect(header("Authorization", "Bearer notion-access-token"))
            .andExpect(jsonPath("$.parent.type").value("data_source_id"))
            .andExpect(jsonPath("$.parent.data_source_id").value("data-source-1"))
            .andExpect(jsonPath("$.properties['직무'].title[0].text.content").value("Backend Developer"))
            .andExpect(jsonPath("$.properties['공고 ID'].number").value(10))
            .andExpect(jsonPath("$.properties['워크스페이스 ID'].number").value(20))
            .andExpect(jsonPath("$.properties['회사명'].rich_text[0].text.content").value("Example Labs"))
            .andExpect(jsonPath("$.properties['상태'].select.name").value("진행 중"))
            .andExpect(jsonPath("$.properties['마감 표시'].rich_text[0].text.content").value("D-4"))
            .andExpect(jsonPath("$.properties['마감일'].date.start").value("2026-07-03"))
            .andExpect(jsonPath("$.properties['마감 임박'].checkbox").value(true))
            .andExpect(jsonPath("$.properties['회사 로고'].files[0].external.url").value("https://example.com/logo.png"))
            .andExpect(jsonPath("$.properties['바로가기'].url").value("https://example.com/jobs/10"))
            .andExpect(jsonPath("$.properties['메모'].rich_text[0].text.content").value("memo"))
            .andRespond(withSuccess("""
                { "id": "page-10", "url": "https://notion.so/page-10" }
                """, MediaType.APPLICATION_JSON));

        NotionPageResult page = client.createJobPage(
            "notion-access-token",
            "data-source-1",
            new NotionJobPageRequest(
                10L,
                20L,
                "Example Labs",
                "Backend Developer",
                "IN_PROGRESS",
                "작성 중",
                "D-4",
                "2026.07.03",
                true,
                "https://example.com/logo.png",
                "https://example.com/jobs/10",
                "memo",
                com.ezone.backend.domain.SyncScope.JOB_ONLY
            )
        );

        assertThat(page.pageId()).isEqualTo("page-10");
        server.verify();
    }

    @Test
    void normalizesKoreanDisplayDeadlineIntoNotionDateProperty() {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        RestNotionClient client = new RestNotionClient(restTemplate, notionProperties());

        server.expect(once(), requestTo("https://api.notion.com/v1/pages"))
            .andExpect(method(HttpMethod.POST))
            .andExpect(jsonPath("$.properties['마감 표시'].rich_text[0].text.content").value("2026년 7월 3일 23:59"))
            .andExpect(jsonPath("$.properties['마감일'].date.start").value("2026-07-03"))
            .andRespond(withSuccess("""
                { "id": "page-10", "url": "https://notion.so/page-10" }
                """, MediaType.APPLICATION_JSON));

        NotionPageResult page = client.createJobPage(
            "notion-access-token",
            "data-source-1",
            new NotionJobPageRequest(
                10L,
                20L,
                "Example Labs",
                "Backend Developer",
                "READY",
                "Ready",
                "2026년 7월 3일 23:59",
                "2026년 7월 3일 23:59",
                false,
                null,
                "https://example.com/jobs/10",
                "",
                com.ezone.backend.domain.SyncScope.JOB_ONLY
            )
        );

        assertThat(page.pageId()).isEqualTo("page-10");
        server.verify();
    }

    @Test
    void fallsBackToDatabaseParentWhenDataSourceParentIsRejected() {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        RestNotionClient client = new RestNotionClient(restTemplate, notionProperties());

        server.expect(once(), requestTo("https://api.notion.com/v1/pages"))
            .andExpect(method(HttpMethod.POST))
            .andExpect(jsonPath("$.parent.type").value("data_source_id"))
            .andExpect(jsonPath("$.parent.data_source_id").value("database-1"))
            .andRespond(withBadRequest().body("""
                { "code": "validation_error", "message": "body failed validation: parent.data_source_id should be a valid data source id" }
                """).contentType(MediaType.APPLICATION_JSON));

        server.expect(once(), requestTo("https://api.notion.com/v1/pages"))
            .andExpect(method(HttpMethod.POST))
            .andExpect(jsonPath("$.parent.type").value("database_id"))
            .andExpect(jsonPath("$.parent.database_id").value("database-1"))
            .andExpect(jsonPath("$.properties['직무'].title[0].text.content").value("Backend Developer"))
            .andRespond(withSuccess("""
                { "id": "page-10", "url": "https://notion.so/page-10" }
                """, MediaType.APPLICATION_JSON));

        NotionPageResult page = client.createJobPage(
            "notion-access-token",
            "database-1",
            new NotionJobPageRequest(
                10L,
                20L,
                "Example Labs",
                "Backend Developer",
                "READY",
                "Ready",
                "D-4",
                "2026-07-03",
                false,
                null,
                "https://example.com/jobs/10",
                "",
                com.ezone.backend.domain.SyncScope.JOB_ONLY
            )
        );

        assertThat(page.pageId()).isEqualTo("page-10");
        server.verify();
    }

    @Test
    void updatesExistingJobPageWithFullBasketProperties() {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        RestNotionClient client = new RestNotionClient(restTemplate, notionProperties());

        server.expect(once(), requestTo("https://api.notion.com/v1/pages/page-10"))
            .andExpect(method(HttpMethod.PATCH))
            .andExpect(header("Authorization", "Bearer notion-access-token"))
            .andExpect(jsonPath("$.properties['공고 ID'].number").value(10))
            .andExpect(jsonPath("$.properties['워크스페이스 ID'].number").value(20))
            .andExpect(jsonPath("$.properties['상태'].select.name").value("지원 전"))
            .andExpect(jsonPath("$.properties['마감 임박'].checkbox").value(false))
            .andRespond(withSuccess("""
                { "id": "page-10", "url": "https://notion.so/page-10" }
                """, MediaType.APPLICATION_JSON));

        NotionPageResult page = client.updateJobPage(
            "notion-access-token",
            "page-10",
            new NotionJobPageRequest(
                10L,
                20L,
                "Example Labs",
                "Backend Developer",
                "READY",
                "Ready",
                "D-4",
                "2026-07-03",
                false,
                null,
                "https://example.com/jobs/10",
                "",
                com.ezone.backend.domain.SyncScope.JOB_ONLY
            )
        );

        assertThat(page.pageId()).isEqualTo("page-10");
        server.verify();
    }

    private NotionProperties notionProperties() {
        return new NotionProperties(
            "notion-client-id",
            "notion-client-secret",
            "https://api.notion.com/v1/oauth/authorize",
            "https://api.notion.com/v1/oauth/token",
            "https://api.notion.com/v1/pages",
            "https://api.notion.com/v1/databases",
            "2022-06-28",
            null
        );
    }
}
