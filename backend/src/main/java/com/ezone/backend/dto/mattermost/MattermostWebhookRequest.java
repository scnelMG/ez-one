package com.ezone.backend.dto.mattermost;

import com.fasterxml.jackson.annotation.JsonAlias;
import java.util.List;
import java.util.Map;

public record MattermostWebhookRequest(
    String token,
    @JsonAlias("channel_id")
    String channelId,
    @JsonAlias({"message_id", "post_id"})
    String messageId,
    @JsonAlias({"sender_name", "user_name"})
    String senderName,
    String text,
    List<String> attachments,
    @JsonAlias("raw_payload")
    Map<String, Object> rawPayload,
    @JsonAlias({"timestamp", "create_at", "post_create_at", "postCreateAt", "posted_at"})
    Object postedAt
) {
    public MattermostWebhookRequest(
        String token,
        String channelId,
        String messageId,
        String senderName,
        String text,
        List<String> attachments,
        Map<String, Object> rawPayload
    ) {
        this(token, channelId, messageId, senderName, text, attachments, rawPayload, null);
    }
}
