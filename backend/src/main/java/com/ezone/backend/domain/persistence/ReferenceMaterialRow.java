package com.ezone.backend.domain.persistence;

import com.ezone.backend.domain.ReferenceType;

public class ReferenceMaterialRow {
    private Long id;
    private Long userId;
    private Long workspaceId;
    private String boardName;
    private ReferenceType referenceType;
    private String title;
    private String body;
    private String url;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public Long getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(Long workspaceId) { this.workspaceId = workspaceId; }
    public String getBoardName() { return boardName; }
    public void setBoardName(String boardName) { this.boardName = boardName; }
    public ReferenceType getReferenceType() { return referenceType; }
    public void setReferenceType(ReferenceType referenceType) { this.referenceType = referenceType; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }
    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }
}
