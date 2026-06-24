package com.ezone.backend.controller;

import com.ezone.backend.dto.ApiResponse;
import com.ezone.backend.dto.notion.NotionConnectRequest;
import com.ezone.backend.dto.notion.NotionConnectionResponse;
import com.ezone.backend.dto.notion.NotionOAuthUrlResponse;
import com.ezone.backend.dto.notion.SyncLogResponse;
import com.ezone.backend.dto.notion.UpdateNotionSyncSettingsRequest;
import com.ezone.backend.service.NotionIntegrationService;
import com.ezone.backend.service.NotionOAuthUrlService;
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
    private final NotionOAuthUrlService notionOAuthUrlService;

    public NotionIntegrationController(
        NotionIntegrationService notionIntegrationService,
        NotionOAuthUrlService notionOAuthUrlService
    ) {
        this.notionIntegrationService = notionIntegrationService;
        this.notionOAuthUrlService = notionOAuthUrlService;
    }

    @GetMapping
    public ApiResponse<NotionConnectionResponse> getConnection() {
        return ApiResponse.success(notionIntegrationService.getConnection(CurrentUserSupport.currentUserId()));
    }

    @GetMapping("/oauth-url")
    public ApiResponse<NotionOAuthUrlResponse> getOAuthUrl(
        @org.springframework.web.bind.annotation.RequestParam String redirectUri,
        @org.springframework.web.bind.annotation.RequestParam String state
    ) {
        return ApiResponse.success(new NotionOAuthUrlResponse(
            notionOAuthUrlService.buildAuthorizationUrl(redirectUri, state)
        ));
    }

    @PostMapping("/connect")
    public ApiResponse<NotionConnectionResponse> connect(@RequestBody NotionConnectRequest request) {
        return ApiResponse.success(notionIntegrationService.connect(
            CurrentUserSupport.currentUserId(),
            request.authorizationCode(),
            request.redirectUri()
        ));
    }

    @DeleteMapping
    public ApiResponse<Void> disconnect() {
        notionIntegrationService.disconnect(CurrentUserSupport.currentUserId());
        return ApiResponse.success(null);
    }

    @PutMapping("/sync-settings")
    public ApiResponse<NotionConnectionResponse> updateSettings(
        @Valid @RequestBody UpdateNotionSyncSettingsRequest request
    ) {
        return ApiResponse.success(notionIntegrationService.updateSettings(
            CurrentUserSupport.currentUserId(),
            request.syncEnabled(),
            request.syncScope()
        ));
    }

    @PostMapping("/sync-now")
    public ApiResponse<NotionConnectionResponse> syncNow() {
        Long userId = CurrentUserSupport.currentUserId();
        notionIntegrationService.syncCurrentBasketJobs(userId);
        return ApiResponse.success(notionIntegrationService.getConnection(userId));
    }

    @GetMapping("/sync-logs")
    public ApiResponse<List<SyncLogResponse>> getSyncLogs() {
        return ApiResponse.success(notionIntegrationService.listSyncLogs(CurrentUserSupport.currentUserId()));
    }
}
