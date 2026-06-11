package com.ezone.backend.dto.study;

import java.time.LocalDateTime;
import java.util.List;

public class SharedEssayDto {
    private String id;
    private String studyId;
    private String userEmail;
    private String workspaceId;
    private List<String> versionIds;
    private LocalDateTime sharedAt;
    
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
    public List<String> getVersionIds() { return versionIds; }
    public void setVersionIds(List<String> versionIds) { this.versionIds = versionIds; }
    public LocalDateTime getSharedAt() { return sharedAt; }
    public void setSharedAt(LocalDateTime sharedAt) { this.sharedAt = sharedAt; }
    public String getCompanyName() { return companyName; }
    public void setCompanyName(String companyName) { this.companyName = companyName; }
    public String getPositionTitle() { return positionTitle; }
    public void setPositionTitle(String positionTitle) { this.positionTitle = positionTitle; }
    public String getDeadlineLabel() { return deadlineLabel; }
    public void setDeadlineLabel(String deadlineLabel) { this.deadlineLabel = deadlineLabel; }
}
