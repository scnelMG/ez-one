package com.ezone.backend.service;

import com.ezone.backend.domain.SyncScope;
import com.ezone.backend.dto.basket.BasketJobResponse;
import com.ezone.backend.dto.notion.NotionConnectionResponse;
import com.ezone.backend.dto.notion.SyncLogResponse;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.stereotype.Service;

@Service
public class NotionIntegrationService {

    private final AtomicLong syncLogId = new AtomicLong(1);
    private NotionConnectionResponse connection = new NotionConnectionResponse(
        false,
        null,
        false,
        SyncScope.JOB_ONLY
    );
    private final List<SyncLogResponse> syncLogs = new ArrayList<>();

    public NotionConnectionResponse getConnection() {
        return connection;
    }

    public NotionConnectionResponse connect() {
        connection = new NotionConnectionResponse(true, "notion@example.com", true, SyncScope.JOB_ONLY);
        addLog("NOTION_CONNECTION", "SUCCESS", "Notion connection saved.");
        return connection;
    }

    public void disconnect() {
        connection = new NotionConnectionResponse(false, null, false, SyncScope.JOB_ONLY);
    }

    public NotionConnectionResponse updateSettings(boolean syncEnabled, SyncScope syncScope) {
        SyncScope p1Scope = syncScope == SyncScope.JOB_ONLY ? syncScope : SyncScope.JOB_ONLY;
        connection = new NotionConnectionResponse(
            connection.connected(),
            connection.notionAccountEmail(),
            syncEnabled,
            p1Scope
        );
        return connection;
    }

    public List<SyncLogResponse> listSyncLogs() {
        List<SyncLogResponse> latestFirst = new ArrayList<>(syncLogs);
        java.util.Collections.reverse(latestFirst);
        return latestFirst;
    }

    public void recordJobOnlySync(BasketJobResponse basketJob) {
        if (!connection.connected() || !connection.syncEnabled() || connection.syncScope() != SyncScope.JOB_ONLY) {
            return;
        }

        addLog(
            "BASKET_JOB",
            "SUCCESS",
            "JOB_ONLY synced: %s / %s".formatted(basketJob.companyName(), basketJob.positionTitle())
        );
    }

    private void addLog(String target, String status, String message) {
        syncLogs.add(new SyncLogResponse(syncLogId.getAndIncrement(), target, status, message));
    }
}
