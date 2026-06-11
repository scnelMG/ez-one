package com.ezone.backend.dto.study;

import java.util.List;

public class ShareEssayRequest {
    private String workspaceId;
    private List<String> versionIds;

    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public List<String> getVersionIds() { return versionIds; }
    public void setVersionIds(List<String> versionIds) { this.versionIds = versionIds; }
}
