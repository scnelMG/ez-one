package com.ezone.backend.dto.study;

public class ShareEssayRequest {
    private String workspaceId;
    private String versionId;

    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getVersionId() { return versionId; }
    public void setVersionId(String versionId) { this.versionId = versionId; }
}
