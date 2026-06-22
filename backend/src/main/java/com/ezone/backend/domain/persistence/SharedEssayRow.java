package com.ezone.backend.domain.persistence;

import java.time.LocalDateTime;

public class SharedEssayRow {
    private String id;
    private String studyId;
    private String userEmail;
    private String workspaceId;
    private String versionIds; // Stored as JSON string
    private String latestAddedVersionIds;
    private LocalDateTime sharedAt;
    private LocalDateTime updatedAt;
    
    // Joined columns from jobs/basket_jobs
    private String companyName;
    private String positionTitle;
    private String deadlineLabel;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getStudyId() { return studyId; }
    public void setStudyId(String studyId) { this.studyId = studyId; }
    public String getUserEmail() { return userEmail; }
    public void setUserEmail(String userEmail) { this.userEmail = userEmail; }
    public String getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(String workspaceId) { this.workspaceId = workspaceId; }
    public String getVersionIds() { return versionIds; }
    public void setVersionIds(String versionIds) { this.versionIds = versionIds; }
    public String getLatestAddedVersionIds() { return latestAddedVersionIds; }
    public void setLatestAddedVersionIds(String latestAddedVersionIds) { this.latestAddedVersionIds = latestAddedVersionIds; }
    public LocalDateTime getSharedAt() { return sharedAt; }
    public void setSharedAt(LocalDateTime sharedAt) { this.sharedAt = sharedAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    public String getCompanyName() { return companyName; }
    public void setCompanyName(String companyName) { this.companyName = companyName; }
    public String getPositionTitle() { return positionTitle; }
    public void setPositionTitle(String positionTitle) { this.positionTitle = positionTitle; }
    public String getDeadlineLabel() { return deadlineLabel; }
    public void setDeadlineLabel(String deadlineLabel) { this.deadlineLabel = deadlineLabel; }
}
