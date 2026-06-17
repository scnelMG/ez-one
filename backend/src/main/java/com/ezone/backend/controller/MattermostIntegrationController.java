package com.ezone.backend.controller;

import com.ezone.backend.dto.ApiResponse;
import com.ezone.backend.dto.mattermost.MattermostIngestResponse;
import com.ezone.backend.dto.mattermost.MattermostWebhookRequest;
import com.ezone.backend.service.MattermostIngestionService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/integrations/mattermost")
public class MattermostIntegrationController {

    private final MattermostIngestionService mattermostIngestionService;
    private final String webhookSecret;

    public MattermostIntegrationController(
        MattermostIngestionService mattermostIngestionService,
        @Value("${mattermost.webhook.secret:test-mm-secret}") String webhookSecret
    ) {
        this.mattermostIngestionService = mattermostIngestionService;
        this.webhookSecret = webhookSecret;
    }

    @PostMapping("/webhook")
    public ApiResponse<MattermostIngestResponse> receiveWebhook(
        @RequestHeader(value = "X-MM-Webhook-Secret", required = false) String secret,
        @RequestBody MattermostWebhookRequest request
    ) {
        String providedSecret = secret == null || secret.isBlank() ? request.token() : secret;
        if (webhookSecret == null || webhookSecret.isBlank() || !webhookSecret.equals(providedSecret)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid Mattermost webhook secret.");
        }
        return ApiResponse.success(mattermostIngestionService.ingest(request));
    }
}
