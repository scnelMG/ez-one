package com.ezone.backend.controller;

import com.ezone.backend.domain.SyncScope;
import com.ezone.backend.dto.ApiResponse;
import com.ezone.backend.dto.notion.NotionConnectRequest;
import com.ezone.backend.dto.notion.NotionConnectionResponse;
import com.ezone.backend.dto.notion.SyncLogResponse;
import com.ezone.backend.dto.notion.UpdateNotionSyncSettingsRequest;
import jakarta.validation.Valid;
import java.util.ArrayList;
import java.util.List;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/integrations/notion")
public class NotionIntegrationController {

    private NotionConnectionResponse connection = new NotionConnectionResponse(
        false,
        null,
        false,
        SyncScope.JOB_ONLY
    );
    private final List<SyncLogResponse> syncLogs = new ArrayList<>();

    @GetMapping
    public ApiResponse<NotionConnectionResponse> getConnection() {
        return ApiResponse.success(connection);
    }

    @PostMapping("/connect")
    public ApiResponse<NotionConnectionResponse> connect(@RequestBody NotionConnectRequest request) {
        connection = new NotionConnectionResponse(true, "notion@example.com", true, SyncScope.JOB_ONLY);
        syncLogs.add(new SyncLogResponse(1L, "NOTION_CONNECTION", "SUCCESS", "Notion connection saved."));
        return ApiResponse.success(connection);
    }

    @DeleteMapping
    public ApiResponse<Void> disconnect() {
        connection = new NotionConnectionResponse(false, null, false, SyncScope.JOB_ONLY);
        return ApiResponse.success(null);
    }

    @PutMapping("/sync-settings")
    public ApiResponse<NotionConnectionResponse> updateSettings(
        @Valid @RequestBody UpdateNotionSyncSettingsRequest request
    ) {
        SyncScope p1Scope = request.syncScope() == SyncScope.JOB_ONLY ? request.syncScope() : SyncScope.JOB_ONLY;
        connection = new NotionConnectionResponse(
            connection.connected(),
            connection.notionAccountEmail(),
            request.syncEnabled(),
            p1Scope
        );
        return ApiResponse.success(connection);
    }

    @GetMapping("/sync-logs")
    public ApiResponse<List<SyncLogResponse>> getSyncLogs() {
        return ApiResponse.success(syncLogs);
    }
}
