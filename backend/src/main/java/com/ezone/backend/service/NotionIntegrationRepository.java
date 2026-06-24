package com.ezone.backend.service;

import java.util.List;
import java.util.Optional;

public interface NotionIntegrationRepository {

    Optional<NotionConnectionRow> findConnection(Long userId);

    void upsertConnection(NotionConnectionRow row);

    void deleteConnection(Long userId);

    Optional<NotionSyncSettingsRow> findSettings(Long userId);

    void upsertSettings(NotionSyncSettingsRow row);

    void insertSyncLog(StoredSyncLogRow row);

    List<StoredSyncLogRow> listSyncLogs(Long userId);

    java.util.Optional<NotionJobSyncRecordRow> findJobSyncRecord(Long userId, Long basketJobId);

    void upsertJobSyncRecord(NotionJobSyncRecordRow row);
}
