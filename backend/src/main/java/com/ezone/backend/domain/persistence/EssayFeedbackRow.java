package com.ezone.backend.domain.persistence;

import java.time.LocalDateTime;

public class EssayFeedbackRow {
    private String id;
    private String sharedEssayId;
    private String authorEmail;
    private String content;
    private LocalDateTime createdAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getSharedEssayId() { return sharedEssayId; }
    public void setSharedEssayId(String sharedEssayId) { this.sharedEssayId = sharedEssayId; }
    public String getAuthorEmail() { return authorEmail; }
    public void setAuthorEmail(String authorEmail) { this.authorEmail = authorEmail; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
