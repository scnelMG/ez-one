package com.ezone.backend.service;

import com.ezone.backend.domain.SyncScope;
import com.ezone.backend.dto.basket.BasketJobResponse;
import com.ezone.backend.dto.notion.NotionConnectionResponse;
import com.ezone.backend.dto.notion.SyncLogResponse;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class NotionIntegrationService {

    private final NotionClient notionClient;
    private final NotionIntegrationRepository repository;
    private final NotionTokenCipher tokenCipher;
    private final P1WorkspaceService workspaceService;

    private static final NotionConnectionResponse DEFAULT_CONNECTION = new NotionConnectionResponse(
        false,
        null,
        false,
        SyncScope.JOB_ONLY
    );

    public NotionIntegrationService(
        NotionClient notionClient,
        NotionIntegrationRepository repository,
        NotionTokenCipher tokenCipher,
        P1WorkspaceService workspaceService
    ) {
        this.notionClient = notionClient;
        this.repository = repository;
        this.tokenCipher = tokenCipher;
        this.workspaceService = workspaceService;
    }

    public NotionConnectionResponse getConnection(Long userId) {
        return repository.findConnection(userId)
            .map(connection -> {
                NotionSyncSettingsRow settings = repository.findSettings(userId)
                    .orElse(new NotionSyncSettingsRow(userId, null, null, null, SyncScope.JOB_ONLY, true));
                return new NotionConnectionResponse(
                    true,
                    connection.notionAccountEmail(),
                    settings.enabled(),
                    settings.syncScope()
                );
            })
            .orElse(DEFAULT_CONNECTION);
    }

    public NotionConnectionResponse connect(Long userId, String authorizationCode, String redirectUri) {
        if (authorizationCode == null || authorizationCode.isBlank() || authorizationCode.contains("expired")) {
            addLog(userId, "NOTION_CONNECTION", "FAILURE", "Notion connection failed or expired.");
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Notion authorization failed.");
        }

        try {
            NotionOAuthToken token = notionClient.exchangeAuthorizationCode(authorizationCode, redirectUri);
            String accessToken = token.accessToken();
            NotionDatabaseResult database = notionClient.createJobsDatabase(accessToken);
            repository.upsertConnection(new NotionConnectionRow(
                userId,
                token.workspaceId(),
                tokenCipher.encrypt(accessToken),
                token.botId(),
                token.ownerEmail()
            ));
            repository.upsertSettings(new NotionSyncSettingsRow(
                userId,
                database.databaseId(),
                database.dataSourceId(),
                database.rootPageId(),
                SyncScope.JOB_ONLY,
                true
            ));
            NotionConnectionResponse connection = new NotionConnectionResponse(
                true,
                token.ownerEmail(),
                true,
                SyncScope.JOB_ONLY
            );
            addLog(userId, "NOTION_CONNECTION", "SUCCESS", "Notion connection saved.");
            syncCurrentBasketJobs(userId);
            return connection;
        } catch (NotionClientException exception) {
            addLog(userId, "NOTION_CONNECTION", "FAILURE", exception.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Notion authorization failed.", exception);
        }
    }

    public void disconnect(Long userId) {
        repository.deleteConnection(userId);
    }

    public NotionConnectionResponse updateSettings(Long userId, boolean syncEnabled, SyncScope syncScope) {
        if (syncScope != SyncScope.JOB_ONLY) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "P1 Notion sync scope must be JOB_ONLY.");
        }

        NotionConnectionRow connection = repository.findConnection(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Notion connection is required."));
        repository.upsertSettings(new NotionSyncSettingsRow(
            userId,
            currentDatabaseId(userId),
            currentDataSourceId(userId),
            currentRootPageId(userId),
            SyncScope.JOB_ONLY,
            syncEnabled
        ));
        return new NotionConnectionResponse(
            true,
            connection.notionAccountEmail(),
            syncEnabled,
            SyncScope.JOB_ONLY
        );
    }

    public List<SyncLogResponse> listSyncLogs(Long userId) {
        return repository.listSyncLogs(userId).stream()
            .map(row -> new SyncLogResponse(row.id(), row.basketJobId(), row.target(), row.status(), row.message()))
            .toList();
    }

    public void recordJobOnlySync(Long userId, BasketJobResponse basketJob) {
        NotionConnectionResponse connection = getConnection(userId);
        if (!connection.connected() || !connection.syncEnabled() || connection.syncScope() != SyncScope.JOB_ONLY) {
            return;
        }
        NotionConnectionRow storedConnection = repository.findConnection(userId).orElse(null);
        if (storedConnection == null || storedConnection.accessTokenCiphertext() == null) {
            addJobLog(userId, basketJob.id(), "FAILURE", "Notion access token is not available.", null);
            return;
        }

        try {
            NotionSyncSettingsRow settings = repository.findSettings(userId)
                .orElseThrow(() -> new NotionClientException("Notion jobs database is not configured."));
            String accessToken = tokenCipher.decrypt(storedConnection.accessTokenCiphertext());
            ensureRootPageTitleIfPossible(accessToken, settings.rootPageId());
            settings = ensureJobsDatabaseOrRecreate(userId, accessToken, settings);
            String dataSourceId = settings.dataSourceId() == null || settings.dataSourceId().isBlank()
                ? settings.databaseId()
                : settings.dataSourceId();
            NotionJobPageRequest pageRequest = new NotionJobPageRequest(
                basketJob.id(),
                basketJob.workspaceId(),
                basketJob.companyName(),
                basketJob.positionTitle(),
                basketJob.applicationStatus().name(),
                basketJob.statusLabel(),
                basketJob.deadlineLabel(),
                basketJob.deadlineDate(),
                basketJob.deadlineSoon(),
                basketJob.companyLogoUrl(),
                basketJob.sourceUrl(),
                basketJob.applicationMemo(),
                SyncScope.JOB_ONLY
            );
            NotionPageResult page = syncJobPage(
                userId,
                basketJob.id(),
                accessToken,
                dataSourceId,
                pageRequest
            );
            repository.upsertJobSyncRecord(new NotionJobSyncRecordRow(basketJob.id(), userId, page.pageId()));
            addJobLog(
                userId,
                basketJob.id(),
                "SUCCESS",
                "JOB_ONLY synced: %s / %s -> %s".formatted(
                    basketJob.companyName(),
                    basketJob.positionTitle(),
                    page.pageId()
                ),
                page.pageId()
            );
        } catch (NotionClientException exception) {
            addJobLog(userId, basketJob.id(), "FAILURE", exception.getMessage(), null);
        } catch (IllegalArgumentException | IllegalStateException exception) {
            addJobLog(userId, basketJob.id(), "FAILURE", "Notion access token could not be decrypted.", null);
        }
    }

    private void addLog(Long userId, String target, String status, String message) {
        repository.insertSyncLog(new StoredSyncLogRow(null, userId, null, SyncScope.JOB_ONLY, target, status, message, null));
    }

    private void addJobLog(Long userId, Long basketJobId, String status, String message, String notionPageId) {
        repository.insertSyncLog(new StoredSyncLogRow(null, userId, basketJobId, SyncScope.JOB_ONLY, "JOB", status, message, notionPageId));
    }

    private void ensureRootPageTitleIfPossible(String accessToken, String rootPageId) {
        try {
            notionClient.ensureJobsRootPageTitle(accessToken, rootPageId);
        } catch (NotionClientException exception) {
            // Page title repair is cosmetic; job sync should keep working if the old root page was archived.
        }
    }

    private NotionSyncSettingsRow ensureJobsDatabaseOrRecreate(
        Long userId,
        String accessToken,
        NotionSyncSettingsRow settings
    ) {
        try {
            notionClient.ensureJobsDatabaseSchema(accessToken, settings.databaseId());
            return settings;
        } catch (NotionClientException exception) {
            if (!isMissingNotionDatabase(exception)) {
                throw exception;
            }
            NotionDatabaseResult replacement = notionClient.createJobsDatabase(accessToken);
            NotionSyncSettingsRow replacementSettings = new NotionSyncSettingsRow(
                userId,
                replacement.databaseId(),
                replacement.dataSourceId(),
                replacement.rootPageId(),
                SyncScope.JOB_ONLY,
                true
            );
            repository.upsertSettings(replacementSettings);
            return replacementSettings;
        }
    }

    private NotionPageResult syncJobPage(
        Long userId,
        Long basketJobId,
        String accessToken,
        String dataSourceId,
        NotionJobPageRequest pageRequest
    ) {
        return repository.findJobSyncRecord(userId, basketJobId)
            .map(record -> updateOrRecreateJobPage(accessToken, dataSourceId, pageRequest, record))
            .orElseGet(() -> notionClient.createJobPage(accessToken, dataSourceId, pageRequest));
    }

    private NotionPageResult updateOrRecreateJobPage(
        String accessToken,
        String dataSourceId,
        NotionJobPageRequest pageRequest,
        NotionJobSyncRecordRow record
    ) {
        try {
            return notionClient.updateJobPage(accessToken, record.notionPageId(), pageRequest);
        } catch (NotionClientException exception) {
            if (isStaleNotionPageReference(exception)) {
                return notionClient.createJobPage(accessToken, dataSourceId, pageRequest);
            }
            throw exception;
        }
    }

    private boolean isStaleNotionPageReference(NotionClientException exception) {
        String message = exception.getMessage();
        return message != null && (
            message.contains("archived ancestor") ||
            message.contains("is not a property that exists") ||
            message.contains("object_not_found")
        );
    }

    private boolean isMissingNotionDatabase(NotionClientException exception) {
        String message = exception.getMessage();
        return message != null && (
            message.contains("object_not_found") ||
            message.contains("Could not find database")
        );
    }

    public void syncCurrentBasketJobs(Long userId) {
        workspaceService.listBasketJobs(userId, null, null)
            .forEach(basketJob -> recordJobOnlySync(userId, basketJob));
    }

    private String currentDatabaseId(Long userId) {
        return repository.findSettings(userId).map(NotionSyncSettingsRow::databaseId).orElse(null);
    }

    private String currentDataSourceId(Long userId) {
        return repository.findSettings(userId).map(NotionSyncSettingsRow::dataSourceId).orElse(null);
    }

    private String currentRootPageId(Long userId) {
        return repository.findSettings(userId).map(NotionSyncSettingsRow::rootPageId).orElse(null);
    }
}
