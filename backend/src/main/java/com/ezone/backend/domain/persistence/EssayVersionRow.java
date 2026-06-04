package com.ezone.backend.domain.persistence;

public class EssayVersionRow {
    private Long id;
    private Long userId;
    private Long workspaceId;
    private Long questionId;
    private String versionName;
    private String body;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public Long getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(Long workspaceId) { this.workspaceId = workspaceId; }
    public Long getQuestionId() { return questionId; }
    public void setQuestionId(Long questionId) { this.questionId = questionId; }
    public String getVersionName() { return versionName; }
    public void setVersionName(String versionName) { this.versionName = versionName; }
    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }
}
