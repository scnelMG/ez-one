package com.ezone.backend.domain.persistence;

import com.ezone.backend.domain.ApplicationStatus;

public class WorkspaceRow {
    private Long id;
    private Long userId;
    private Long basketJobId;
    private String companyName;
    private String positionTitle;
    private String deadlineLabel;
    private ApplicationStatus applicationStatus;
    private String sourceUrl;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public Long getBasketJobId() { return basketJobId; }
    public void setBasketJobId(Long basketJobId) { this.basketJobId = basketJobId; }
    public String getCompanyName() { return companyName; }
    public void setCompanyName(String companyName) { this.companyName = companyName; }
    public String getPositionTitle() { return positionTitle; }
    public void setPositionTitle(String positionTitle) { this.positionTitle = positionTitle; }
    public String getDeadlineLabel() { return deadlineLabel; }
    public void setDeadlineLabel(String deadlineLabel) { this.deadlineLabel = deadlineLabel; }
    public ApplicationStatus getApplicationStatus() { return applicationStatus; }
    public void setApplicationStatus(ApplicationStatus applicationStatus) { this.applicationStatus = applicationStatus; }
    public String getSourceUrl() { return sourceUrl; }
    public void setSourceUrl(String sourceUrl) { this.sourceUrl = sourceUrl; }
}
