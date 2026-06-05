package com.ezone.backend.service;

import com.ezone.backend.domain.SyncScope;
import com.ezone.backend.dto.basket.BasketJobResponse;
import com.ezone.backend.dto.notion.NotionConnectionResponse;
import com.ezone.backend.dto.notion.SyncLogResponse;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class NotionIntegrationService {

    private final AtomicLong syncLogId = new AtomicLong(1);
    private final Map<Long, NotionConnectionResponse> connections = new ConcurrentHashMap<>();
    private final Map<Long, List<SyncLogResponse>> syncLogs = new ConcurrentHashMap<>();

    private static final NotionConnectionResponse DEFAULT_CONNECTION = new NotionConnectionResponse(
        false,
        null,
        false,
        SyncScope.JOB_ONLY
    );

    public NotionConnectionResponse getConnection(Long userId) {
        return connections.getOrDefault(userId, DEFAULT_CONNECTION);
    }

    public NotionConnectionResponse connect(Long userId, String authorizationCode) {
        if (authorizationCode == null || authorizationCode.isBlank() || authorizationCode.contains("expired")) {
            addLog(userId, "NOTION_CONNECTION", "FAILURE", "Notion connection failed or expired.");
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Notion authorization failed.");
        }

        NotionConnectionResponse connection = new NotionConnectionResponse(true, "notion@example.com", true, SyncScope.JOB_ONLY);
        connections.put(userId, connection);
        addLog(userId, "NOTION_CONNECTION", "SUCCESS", "Notion connection saved.");
        return connection;
    }

    public void disconnect(Long userId) {
        connections.put(userId, DEFAULT_CONNECTION);
    }

    public NotionConnectionResponse updateSettings(Long userId, boolean syncEnabled, SyncScope syncScope) {
        if (syncScope != SyncScope.JOB_ONLY) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "P1 Notion sync scope must be JOB_ONLY.");
        }

        NotionConnectionResponse currentConnection = getConnection(userId);
        NotionConnectionResponse connection = new NotionConnectionResponse(
            currentConnection.connected(),
            currentConnection.notionAccountEmail(),
            syncEnabled,
            SyncScope.JOB_ONLY
        );
        connections.put(userId, connection);
        return connection;
    }

    public List<SyncLogResponse> listSyncLogs(Long userId) {
        List<SyncLogResponse> latestFirst = new ArrayList<>(syncLogs.getOrDefault(userId, List.of()));
        java.util.Collections.reverse(latestFirst);
        return latestFirst;
    }

    public void recordJobOnlySync(Long userId, BasketJobResponse basketJob) {
        NotionConnectionResponse connection = getConnection(userId);
        if (!connection.connected() || !connection.syncEnabled() || connection.syncScope() != SyncScope.JOB_ONLY) {
            return;
        }

        addLog(
            userId,
            "BASKET_JOB",
            "SUCCESS",
            "JOB_ONLY synced: %s / %s".formatted(basketJob.companyName(), basketJob.positionTitle())
        );
    }

    private void addLog(Long userId, String target, String status, String message) {
        syncLogs.computeIfAbsent(userId, ignored -> new ArrayList<>())
            .add(new SyncLogResponse(syncLogId.getAndIncrement(), target, status, message));
    }
}
