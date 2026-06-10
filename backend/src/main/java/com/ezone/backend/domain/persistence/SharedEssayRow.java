package com.ezone.backend.domain.persistence;

import java.time.LocalDateTime;

public class SharedEssayRow {
    private String id;
    private String studyId;
    private String userEmail;
    private String workspaceId;
    private String versionId;
    private LocalDateTime sharedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getStudyId() { return studyId; }
    public void setStudyId(String studyId) { this.studyId = studyId; }
    public String getUserEmail() { return userEmail; }
    public void setUserEmail(String userEmail) { this.userEmail = userEmail; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getVersionId() { return versionId; }
    public void setVersionId(String versionId) { this.versionId = versionId; }
    public LocalDateTime getSharedAt() { return sharedAt; }
    public void setSharedAt(LocalDateTime sharedAt) { this.sharedAt = sharedAt; }
}
