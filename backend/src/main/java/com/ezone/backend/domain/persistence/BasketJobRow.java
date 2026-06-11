package com.ezone.backend.domain.persistence;

import com.ezone.backend.domain.ApplicationStatus;

public class BasketJobRow {
    private Long id;
    private Long userId;
    private Long jobId;
    private Long workspaceId;
    private String companyName;
    private String positionTitle;
    private ApplicationStatus applicationStatus;
    private String deadlineLabel;
    private String deadlineDate;
    private boolean deadlineSoon;
    private String companyLogoUrl;
    private String sourceUrl;
    private String applicationMemo;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public Long getJobId() { return jobId; }
    public void setJobId(Long jobId) { this.jobId = jobId; }
    public Long getWorkspaceId() { return workspaceId; }
    public void setWorkspaceId(Long workspaceId) { this.workspaceId = workspaceId; }
    public String getCompanyName() { return companyName; }
    public void setCompanyName(String companyName) { this.companyName = companyName; }
    public String getPositionTitle() { return positionTitle; }
    public void setPositionTitle(String positionTitle) { this.positionTitle = positionTitle; }
    public ApplicationStatus getApplicationStatus() { return applicationStatus; }
    public void setApplicationStatus(ApplicationStatus applicationStatus) { this.applicationStatus = applicationStatus; }
    public String getDeadlineLabel() { return deadlineLabel; }
    public void setDeadlineLabel(String deadlineLabel) { this.deadlineLabel = deadlineLabel; }
    public String getDeadlineDate() { return deadlineDate; }
    public void setDeadlineDate(String deadlineDate) { this.deadlineDate = deadlineDate; }
    public boolean isDeadlineSoon() { return deadlineSoon; }
    public void setDeadlineSoon(boolean deadlineSoon) { this.deadlineSoon = deadlineSoon; }
    public String getCompanyLogoUrl() { return companyLogoUrl; }
    public void setCompanyLogoUrl(String companyLogoUrl) { this.companyLogoUrl = companyLogoUrl; }
    public String getSourceUrl() { return sourceUrl; }
    public void setSourceUrl(String sourceUrl) { this.sourceUrl = sourceUrl; }
    public String getApplicationMemo() { return applicationMemo; }
    public void setApplicationMemo(String applicationMemo) { this.applicationMemo = applicationMemo; }
}
