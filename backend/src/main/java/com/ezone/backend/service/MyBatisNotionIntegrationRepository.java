package com.ezone.backend.service;

import com.ezone.backend.mapper.NotionIntegrationMapper;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Repository;

@Repository
public class MyBatisNotionIntegrationRepository implements NotionIntegrationRepository {

    private final NotionIntegrationMapper mapper;

    public MyBatisNotionIntegrationRepository(NotionIntegrationMapper mapper) {
        this.mapper = mapper;
    }

    @Override
    public Optional<NotionConnectionRow> findConnection(Long userId) {
        return mapper.findConnection(userId);
    }

    @Override
    public void upsertConnection(NotionConnectionRow row) {
        mapper.upsertConnection(row);
    }

    @Override
    public void deleteConnection(Long userId) {
        mapper.deleteConnection(userId);
    }

    @Override
    public Optional<NotionSyncSettingsRow> findSettings(Long userId) {
        return mapper.findSettings(userId);
    }

    @Override
    public void upsertSettings(NotionSyncSettingsRow row) {
        mapper.upsertSettings(row);
    }

    @Override
    public void insertSyncLog(StoredSyncLogRow row) {
        mapper.insertSyncLog(row);
    }

    @Override
    public List<StoredSyncLogRow> listSyncLogs(Long userId) {
        return mapper.listSyncLogs(userId);
    }

    @Override
    public Optional<NotionJobSyncRecordRow> findJobSyncRecord(Long userId, Long basketJobId) {
        return mapper.findJobSyncRecord(userId, basketJobId);
    }

    @Override
    public void upsertJobSyncRecord(NotionJobSyncRecordRow row) {
        mapper.upsertJobSyncRecord(row);
    }
}
