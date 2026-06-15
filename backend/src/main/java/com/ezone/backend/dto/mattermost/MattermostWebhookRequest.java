package com.ezone.backend.dto.mattermost;

import java.util.List;
import java.util.Map;

public record MattermostWebhookRequest(
    String channelId,
    String messageId,
    String senderName,
    String text,
    List<String> attachments,
    Map<String, Object> rawPayload
) {
}
