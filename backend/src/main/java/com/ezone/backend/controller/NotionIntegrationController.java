package com.ezone.backend.controller;

import com.ezone.backend.dto.ApiResponse;
import com.ezone.backend.dto.notion.NotionConnectRequest;
import com.ezone.backend.dto.notion.NotionConnectionResponse;
import com.ezone.backend.dto.notion.SyncLogResponse;
import com.ezone.backend.dto.notion.UpdateNotionSyncSettingsRequest;
import com.ezone.backend.service.NotionIntegrationService;
import jakarta.validation.Valid;
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

    private final NotionIntegrationService notionIntegrationService;

    public NotionIntegrationController(NotionIntegrationService notionIntegrationService) {
        this.notionIntegrationService = notionIntegrationService;
    }

    @GetMapping
    public ApiResponse<NotionConnectionResponse> getConnection() {
        return ApiResponse.success(notionIntegrationService.getConnection());
    }

    @PostMapping("/connect")
    public ApiResponse<NotionConnectionResponse> connect(@RequestBody NotionConnectRequest request) {
        return ApiResponse.success(notionIntegrationService.connect());
    }

    @DeleteMapping
    public ApiResponse<Void> disconnect() {
        notionIntegrationService.disconnect();
        return ApiResponse.success(null);
    }

    @PutMapping("/sync-settings")
    public ApiResponse<NotionConnectionResponse> updateSettings(
        @Valid @RequestBody UpdateNotionSyncSettingsRequest request
    ) {
        return ApiResponse.success(notionIntegrationService.updateSettings(request.syncEnabled(), request.syncScope()));
    }

    @GetMapping("/sync-logs")
    public ApiResponse<List<SyncLogResponse>> getSyncLogs() {
        return ApiResponse.success(notionIntegrationService.listSyncLogs());
    }
}
