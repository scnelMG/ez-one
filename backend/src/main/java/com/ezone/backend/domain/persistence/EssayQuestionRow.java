package com.ezone.backend.domain.persistence;

public class EssayQuestionRow {
    private Long id;
    private Long workspaceId;
    private String prompt;
    private String draft;
    private int maxLength;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(Long workspaceId) { this.workspaceId = workspaceId; }
    public String getPrompt() { return prompt; }
    public void setPrompt(String prompt) { this.prompt = prompt; }
    public String getDraft() { return draft; }
    public void setDraft(String draft) { this.draft = draft; }
    public int getMaxLength() { return maxLength; }
    public void setMaxLength(int maxLength) { this.maxLength = maxLength; }
}
