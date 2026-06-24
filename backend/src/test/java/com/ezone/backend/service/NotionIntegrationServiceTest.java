package com.ezone.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.ezone.backend.domain.ApplicationStatus;
import com.ezone.backend.domain.SyncScope;
import com.ezone.backend.dto.basket.BasketJobResponse;
import com.ezone.backend.dto.notion.SyncLogResponse;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class NotionIntegrationServiceTest {

    @Test
    void connectExchangesAuthorizationCodeWithoutUserSuppliedApiKey() {
        FakeNotionClient notionClient = new FakeNotionClient();
        FakeNotionIntegrationRepository repository = new FakeNotionIntegrationRepository();
        NotionIntegrationService service = new NotionIntegrationService(
            notionClient,
            repository,
            new PrefixNotionTokenCipher(),
            emptyWorkspaceService()
        );

        var connection = service.connect(1L, "oauth-code", "http://localhost:5173/mypage/notion/callback");

        assertThat(notionClient.lastAuthorizationCode).isEqualTo("oauth-code");
        assertThat(notionClient.lastRedirectUri).isEqualTo("http://localhost:5173/mypage/notion/callback");
        assertThat(connection.connected()).isTrue();
        assertThat(connection.notionAccountEmail()).isEqualTo("notion-user@example.com");
        assertThat(connection.syncEnabled()).isTrue();
        assertThat(connection.syncScope()).isEqualTo(SyncScope.JOB_ONLY);
        assertThat(repository.connection.accessTokenCiphertext()).isEqualTo("cipher:token-1");
        assertThat(notionClient.createdDatabase).isTrue();
        assertThat(repository.settings.databaseId()).isEqualTo("database-1");
        assertThat(repository.settings.dataSourceId()).isEqualTo("data-source-1");
        assertThat(repository.settings.rootPageId()).isEqualTo("root-page-1");
    }

    @Test
    void connectBackfillsCurrentBasketJobsIntoCreatedNotionDatabase() {
        FakeNotionClient notionClient = new FakeNotionClient();
        FakeNotionIntegrationRepository repository = new FakeNotionIntegrationRepository();
        P1WorkspaceService workspaceService = mock(P1WorkspaceService.class);
        BasketJobResponse firstJob = basketJob();
        BasketJobResponse secondJob = new BasketJobResponse(
            11L,
            21L,
            "Second Labs",
            "Frontend Developer",
            ApplicationStatus.READY,
            "Ready",
            "2026.07.01",
            "2026.07.01",
            false,
            "https://example.com/logo2.png",
            "https://example.com/jobs/11",
            "포트폴리오 확인"
        );
        when(workspaceService.listBasketJobs(1L, null, null)).thenReturn(java.util.List.of(firstJob, secondJob));
        NotionIntegrationService service = new NotionIntegrationService(
            notionClient,
            repository,
            new PrefixNotionTokenCipher(),
            workspaceService
        );

        service.connect(1L, "oauth-code", "http://localhost:5173/mypage/notion/callback");

        assertThat(notionClient.createdJobs)
            .extracting(NotionJobPageRequest::basketJobId)
            .containsExactly(10L, 11L);
        assertThat(notionClient.createdJobDataSourceIds).containsExactly("data-source-1", "data-source-1");
        assertThat(service.listSyncLogs(1L))
            .extracting(SyncLogResponse::target, SyncLogResponse::status)
            .contains(
                org.assertj.core.api.Assertions.tuple("JOB", "SUCCESS"),
                org.assertj.core.api.Assertions.tuple("NOTION_CONNECTION", "SUCCESS")
            );
    }

    @Test
    void recordJobOnlySyncCreatesNotionPageAndLogsSuccess() {
        FakeNotionClient notionClient = new FakeNotionClient();
        FakeNotionIntegrationRepository repository = new FakeNotionIntegrationRepository();
        NotionIntegrationService service = new NotionIntegrationService(
            notionClient,
            repository,
            new PrefixNotionTokenCipher(),
            emptyWorkspaceService()
        );
        service.connect(1L, "oauth-code", "http://localhost:5173/mypage/notion/callback");
        service.updateSettings(1L, true, SyncScope.JOB_ONLY);

        service.recordJobOnlySync(1L, basketJob());

        assertThat(notionClient.createdJob.basketJobId()).isEqualTo(10L);
        assertThat(notionClient.ensuredDatabaseIds).contains("database-1");
        assertThat(notionClient.ensuredRootPageIds).contains("root-page-1");
        assertThat(notionClient.createdJobDataSourceId).isEqualTo("data-source-1");
        assertThat(notionClient.createdJob.workspaceId()).isEqualTo(20L);
        assertThat(notionClient.createdJob.companyName()).isEqualTo("Example Labs");
        assertThat(notionClient.createdJob.positionTitle()).isEqualTo("Backend Developer");
        assertThat(notionClient.createdJob.applicationStatus()).isEqualTo("READY");
        assertThat(notionClient.createdJob.statusLabel()).isEqualTo("Ready");
        assertThat(notionClient.createdJob.deadlineDate()).isEqualTo("2026.06.30");
        assertThat(notionClient.createdJob.deadlineSoon()).isFalse();
        assertThat(notionClient.createdJob.companyLogoUrl()).isEqualTo("https://example.com/logo.png");
        assertThat(notionClient.createdJob.sourceUrl()).isEqualTo("https://example.com/jobs/10");
        assertThat(notionClient.createdJob.applicationMemo()).isEqualTo("");
        assertThat(notionClient.createdJob.syncScope()).isEqualTo(SyncScope.JOB_ONLY);
        assertThat(service.listSyncLogs(1L).get(0).status()).isEqualTo("SUCCESS");
        assertThat(service.listSyncLogs(1L).get(0).basketJobId()).isEqualTo(10L);
        assertThat(service.listSyncLogs(1L).get(0).message()).contains("page-10");
        assertThat(repository.jobSyncRecords).containsKey(10L);
    }

    @Test
    void recordJobOnlySyncUpdatesAlreadySyncedBasketJobWithoutCreatingDuplicatePage() {
        FakeNotionClient notionClient = new FakeNotionClient();
        FakeNotionIntegrationRepository repository = new FakeNotionIntegrationRepository();
        NotionIntegrationService service = new NotionIntegrationService(
            notionClient,
            repository,
            new PrefixNotionTokenCipher(),
            emptyWorkspaceService()
        );
        service.connect(1L, "oauth-code", "http://localhost:5173/mypage/notion/callback");
        service.recordJobOnlySync(1L, basketJob());

        service.recordJobOnlySync(1L, basketJob());

        assertThat(notionClient.createdJobs)
            .extracting(NotionJobPageRequest::basketJobId)
            .containsExactly(10L);
        assertThat(notionClient.updatedJobs)
            .extracting(NotionJobPageRequest::basketJobId)
            .containsExactly(10L);
        assertThat(notionClient.updatedPageIds).containsExactly("page-10");
    }

    @Test
    void recordJobOnlySyncRecreatesPageWhenStoredNotionPageCanNoLongerBeUpdated() {
        FakeNotionClient notionClient = new FakeNotionClient();
        notionClient.updateFailureMessage = "Notion page update failed. Can't edit page on block with an archived ancestor.";
        FakeNotionIntegrationRepository repository = new FakeNotionIntegrationRepository();
        NotionIntegrationService service = new NotionIntegrationService(
            notionClient,
            repository,
            new PrefixNotionTokenCipher(),
            emptyWorkspaceService()
        );
        service.connect(1L, "oauth-code", "http://localhost:5173/mypage/notion/callback");
        repository.upsertJobSyncRecord(new NotionJobSyncRecordRow(10L, 1L, "archived-page-10"));

        service.recordJobOnlySync(1L, basketJob());

        assertThat(notionClient.updatedPageIds).containsExactly("archived-page-10");
        assertThat(notionClient.createdJobs)
            .extracting(NotionJobPageRequest::basketJobId)
            .containsExactly(10L);
        assertThat(repository.jobSyncRecords.get(10L).notionPageId()).isEqualTo("page-10");
        assertThat(service.listSyncLogs(1L).get(0).status()).isEqualTo("SUCCESS");
    }

    @Test
    void recordJobOnlySyncContinuesWhenRootPageTitleUpdateFails() {
        FakeNotionClient notionClient = new FakeNotionClient();
        notionClient.rootTitleFailureMessage = "Notion root page title update failed. Can't edit block that is archived.";
        FakeNotionIntegrationRepository repository = new FakeNotionIntegrationRepository();
        NotionIntegrationService service = new NotionIntegrationService(
            notionClient,
            repository,
            new PrefixNotionTokenCipher(),
            emptyWorkspaceService()
        );
        service.connect(1L, "oauth-code", "http://localhost:5173/mypage/notion/callback");

        service.recordJobOnlySync(1L, basketJob());

        assertThat(notionClient.createdJob.basketJobId()).isEqualTo(10L);
        assertThat(service.listSyncLogs(1L).get(0).status()).isEqualTo("SUCCESS");
        assertThat(service.listSyncLogs(1L).get(0).message()).doesNotContain("root page title update failed");
    }

    @Test
    void recordJobOnlySyncRecreatesJobsDatabaseWhenStoredDatabaseIsMissing() {
        FakeNotionClient notionClient = new FakeNotionClient();
        notionClient.schemaFailureMessage = "Notion jobs database schema update failed. {\"code\":\"object_not_found\",\"message\":\"Could not find database\"}";
        FakeNotionIntegrationRepository repository = new FakeNotionIntegrationRepository();
        NotionIntegrationService service = new NotionIntegrationService(
            notionClient,
            repository,
            new PrefixNotionTokenCipher(),
            emptyWorkspaceService()
        );
        service.connect(1L, "oauth-code", "http://localhost:5173/mypage/notion/callback");
        notionClient.createdJobs.clear();

        service.recordJobOnlySync(1L, basketJob());

        assertThat(repository.settings.databaseId()).isEqualTo("database-2");
        assertThat(repository.settings.dataSourceId()).isEqualTo("data-source-2");
        assertThat(repository.settings.rootPageId()).isEqualTo("root-page-2");
        assertThat(notionClient.createdJobDataSourceId).isEqualTo("data-source-2");
        assertThat(service.listSyncLogs(1L).get(0).status()).isEqualTo("SUCCESS");
    }

    @Test
    void syncCurrentBasketJobsBackfillsExistingConnectedAccount() {
        FakeNotionClient notionClient = new FakeNotionClient();
        FakeNotionIntegrationRepository repository = new FakeNotionIntegrationRepository();
        P1WorkspaceService workspaceService = mock(P1WorkspaceService.class);
        when(workspaceService.listBasketJobs(1L, null, null)).thenReturn(java.util.List.of(basketJob()));
        NotionIntegrationService service = new NotionIntegrationService(
            notionClient,
            repository,
            new PrefixNotionTokenCipher(),
            workspaceService
        );
        service.connect(1L, "oauth-code", "http://localhost:5173/mypage/notion/callback");
        notionClient.createdJobs.clear();

        service.syncCurrentBasketJobs(1L);

        assertThat(notionClient.createdJobs)
            .extracting(NotionJobPageRequest::basketJobId)
            .isEmpty();
        assertThat(notionClient.updatedJobs)
            .extracting(NotionJobPageRequest::basketJobId)
            .containsExactly(10L);

        repository.jobSyncRecords.clear();
        notionClient.updatedJobs.clear();
        service.syncCurrentBasketJobs(1L);

        assertThat(notionClient.createdJobs)
            .extracting(NotionJobPageRequest::basketJobId)
            .containsExactly(10L);
    }

    @Test
    void notionFailureIsLoggedWithoutThrowingToCoreSaveFlow() {
        FakeNotionClient notionClient = new FakeNotionClient();
        notionClient.failCreatePage = true;
        NotionIntegrationService service = new NotionIntegrationService(
            notionClient,
            new FakeNotionIntegrationRepository(),
            new PrefixNotionTokenCipher(),
            emptyWorkspaceService()
        );
        service.connect(1L, "oauth-code", "http://localhost:5173/mypage/notion/callback");
        service.updateSettings(1L, true, SyncScope.JOB_ONLY);

        assertThatCode(() -> service.recordJobOnlySync(1L, basketJob()))
            .doesNotThrowAnyException();

        assertThat(service.listSyncLogs(1L).get(0).status()).isEqualTo("FAILURE");
    }

    @Test
    void p1RejectsExpandedSyncScopes() {
        NotionIntegrationService service = new NotionIntegrationService(
            new FakeNotionClient(),
            new FakeNotionIntegrationRepository(),
            new PrefixNotionTokenCipher(),
            emptyWorkspaceService()
        );

        assertThatThrownBy(() -> service.updateSettings(1L, true, SyncScope.JOB_WITH_ESSAY))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("JOB_ONLY");
    }

    @Test
    void restoredServiceUsesPersistedEncryptedTokenAfterRestart() {
        FakeNotionIntegrationRepository repository = new FakeNotionIntegrationRepository();
        NotionIntegrationService firstService = new NotionIntegrationService(
            new FakeNotionClient(),
            repository,
            new PrefixNotionTokenCipher(),
            emptyWorkspaceService()
        );
        firstService.connect(1L, "oauth-code", "http://localhost:5173/mypage/notion/callback");
        firstService.updateSettings(1L, true, SyncScope.JOB_ONLY);

        FakeNotionClient restartedClient = new FakeNotionClient();
        NotionIntegrationService restartedService = new NotionIntegrationService(
            restartedClient,
            repository,
            new PrefixNotionTokenCipher(),
            emptyWorkspaceService()
        );

        assertThat(restartedService.getConnection(1L).connected()).isTrue();
        restartedService.recordJobOnlySync(1L, basketJob());

        assertThat(restartedClient.createdJob.basketJobId()).isEqualTo(10L);
        assertThat(restartedClient.createdJobDataSourceId).isEqualTo("data-source-1");
        assertThat(restartedService.listSyncLogs(1L).get(0).status()).isEqualTo("SUCCESS");
    }

    private BasketJobResponse basketJob() {
        return new BasketJobResponse(
            10L,
            20L,
            "Example Labs",
            "Backend Developer",
            ApplicationStatus.READY,
            "Ready",
            "2026.06.30",
            "2026.06.30",
            false,
            "https://example.com/logo.png",
            "https://example.com/jobs/10",
            ""
        );
    }

    private P1WorkspaceService emptyWorkspaceService() {
        P1WorkspaceService workspaceService = mock(P1WorkspaceService.class);
        when(workspaceService.listBasketJobs(1L, null, null)).thenReturn(java.util.List.of());
        return workspaceService;
    }

    private static class FakeNotionClient implements NotionClient {
        private String lastAuthorizationCode;
        private String lastRedirectUri;
        private NotionJobPageRequest createdJob;
        private String createdJobDataSourceId;
        private final java.util.List<NotionJobPageRequest> createdJobs = new java.util.ArrayList<>();
        private final java.util.List<NotionJobPageRequest> updatedJobs = new java.util.ArrayList<>();
        private final java.util.List<String> createdJobDataSourceIds = new java.util.ArrayList<>();
        private final java.util.List<String> updatedPageIds = new java.util.ArrayList<>();
        private final java.util.List<String> ensuredDatabaseIds = new java.util.ArrayList<>();
        private final java.util.List<String> ensuredRootPageIds = new java.util.ArrayList<>();
        private boolean createdDatabase;
        private boolean failCreatePage;
        private String updateFailureMessage;
        private String rootTitleFailureMessage;
        private String schemaFailureMessage;
        private int createdDatabaseCount;

        @Override
        public NotionOAuthToken exchangeAuthorizationCode(String authorizationCode, String redirectUri) {
            lastAuthorizationCode = authorizationCode;
            lastRedirectUri = redirectUri;
            return new NotionOAuthToken(
                "token-1",
                "workspace-1",
                "bot-1",
                "notion-user@example.com"
            );
        }

        @Override
        public NotionDatabaseResult createJobsDatabase(String accessToken) {
            assertThat(accessToken).isEqualTo("token-1");
            createdDatabase = true;
            createdDatabaseCount++;
            return new NotionDatabaseResult(
                "root-page-" + createdDatabaseCount,
                "database-" + createdDatabaseCount,
                "data-source-" + createdDatabaseCount
            );
        }

        @Override
        public void ensureJobsRootPageTitle(String accessToken, String rootPageId) {
            assertThat(accessToken).isEqualTo("token-1");
            ensuredRootPageIds.add(rootPageId);
            if (rootTitleFailureMessage != null) {
                throw new NotionClientException(rootTitleFailureMessage);
            }
        }

        @Override
        public void ensureJobsDatabaseSchema(String accessToken, String databaseId) {
            assertThat(accessToken).isEqualTo("token-1");
            ensuredDatabaseIds.add(databaseId);
            if (schemaFailureMessage != null) {
                String message = schemaFailureMessage;
                schemaFailureMessage = null;
                throw new NotionClientException(message);
            }
        }

        @Override
        public NotionPageResult createJobPage(String accessToken, String dataSourceId, NotionJobPageRequest request) {
            if (failCreatePage) {
                throw new NotionClientException("Notion API unavailable");
            }
            assertThat(accessToken).isEqualTo("token-1");
            createdJobDataSourceId = dataSourceId;
            createdJob = request;
            createdJobDataSourceIds.add(dataSourceId);
            createdJobs.add(request);
            return new NotionPageResult("page-" + request.basketJobId(), "https://notion.so/page-" + request.basketJobId());
        }

        @Override
        public NotionPageResult updateJobPage(String accessToken, String pageId, NotionJobPageRequest request) {
            if (failCreatePage) {
                throw new NotionClientException("Notion API unavailable");
            }
            assertThat(accessToken).isEqualTo("token-1");
            updatedPageIds.add(pageId);
            if (updateFailureMessage != null) {
                throw new NotionClientException(updateFailureMessage);
            }
            updatedJobs.add(request);
            return new NotionPageResult(pageId, "https://notion.so/" + pageId);
        }
    }

    private static class FakeNotionIntegrationRepository implements NotionIntegrationRepository {
        private NotionConnectionRow connection;
        private NotionSyncSettingsRow settings;
        private final java.util.List<StoredSyncLogRow> logs = new java.util.ArrayList<>();
        private final java.util.Map<Long, NotionJobSyncRecordRow> jobSyncRecords = new java.util.HashMap<>();

        @Override
        public java.util.Optional<NotionConnectionRow> findConnection(Long userId) {
            return connection == null || !connection.userId().equals(userId)
                ? java.util.Optional.empty()
                : java.util.Optional.of(connection);
        }

        @Override
        public void upsertConnection(NotionConnectionRow row) {
            connection = row;
        }

        @Override
        public void deleteConnection(Long userId) {
            connection = null;
        }

        @Override
        public java.util.Optional<NotionSyncSettingsRow> findSettings(Long userId) {
            return settings == null || !settings.userId().equals(userId)
                ? java.util.Optional.empty()
                : java.util.Optional.of(settings);
        }

        @Override
        public void upsertSettings(NotionSyncSettingsRow row) {
            settings = row;
        }

        @Override
        public void insertSyncLog(StoredSyncLogRow row) {
            logs.add(0, row);
        }

        @Override
        public java.util.List<StoredSyncLogRow> listSyncLogs(Long userId) {
            return logs.stream()
                .filter(row -> row.userId().equals(userId))
                .toList();
        }

        @Override
        public java.util.Optional<NotionJobSyncRecordRow> findJobSyncRecord(Long userId, Long basketJobId) {
            NotionJobSyncRecordRow row = jobSyncRecords.get(basketJobId);
            return row == null || !row.userId().equals(userId)
                ? java.util.Optional.empty()
                : java.util.Optional.of(row);
        }

        @Override
        public void upsertJobSyncRecord(NotionJobSyncRecordRow row) {
            jobSyncRecords.put(row.basketJobId(), row);
        }
    }

    private static class PrefixNotionTokenCipher implements NotionTokenCipher {
        @Override
        public String encrypt(String plaintext) {
            return "cipher:" + plaintext;
        }

        @Override
        public String decrypt(String ciphertext) {
            return ciphertext.replaceFirst("^cipher:", "");
        }
    }
}
