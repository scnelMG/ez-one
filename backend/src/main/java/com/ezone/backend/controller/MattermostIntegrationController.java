package com.ezone.backend.controller;

import com.ezone.backend.dto.ApiResponse;
import com.ezone.backend.dto.mattermost.MattermostIngestResponse;
import com.ezone.backend.dto.mattermost.MattermostWebhookRequest;
import com.ezone.backend.service.MattermostIngestionService;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;
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
    private final Set<String> webhookSecrets;

    public MattermostIntegrationController(
        MattermostIngestionService mattermostIngestionService,
        @Value("${mattermost.webhook.secret:}") String webhookSecret,
        @Value("${mattermost.webhook.secrets:}") String webhookSecrets
    ) {
        this.mattermostIngestionService = mattermostIngestionService;
        this.webhookSecrets = parseSecrets(webhookSecret, webhookSecrets);
    }

    @PostMapping("/webhook")
    public ApiResponse<MattermostIngestResponse> receiveWebhook(
        @RequestHeader(value = "X-MM-Webhook-Secret", required = false) String secret,
        @RequestBody MattermostWebhookRequest request
    ) {
        String providedSecret = secret == null || secret.isBlank() ? request.token() : secret;
        if (providedSecret == null || providedSecret.isBlank() || !webhookSecrets.contains(providedSecret)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid Mattermost webhook secret.");
        }
        return ApiResponse.success(mattermostIngestionService.ingest(request));
    }

    private Set<String> parseSecrets(String webhookSecret, String webhookSecrets) {
        return Arrays.stream((safe(webhookSecret) + "," + safe(webhookSecrets)).split(","))
            .map(String::trim)
            .filter(value -> !value.isBlank())
            .collect(Collectors.toUnmodifiableSet());
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }
}
