package com.ezone.backend.domain.persistence;

public class JobRow {
    private Long id;
    private Long companyId;
    private String companyName;
    private String positionTitle;
    private String deadlineLabel;
    private String sourceUrl;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getCompanyId() { return companyId; }
    public void setCompanyId(Long companyId) { this.companyId = companyId; }
    public String getCompanyName() { return companyName; }
    public void setCompanyName(String companyName) { this.companyName = companyName; }
    public String getPositionTitle() { return positionTitle; }
    public void setPositionTitle(String positionTitle) { this.positionTitle = positionTitle; }
    public String getDeadlineLabel() { return deadlineLabel; }
    public void setDeadlineLabel(String deadlineLabel) { this.deadlineLabel = deadlineLabel; }
    public String getSourceUrl() { return sourceUrl; }
    public void setSourceUrl(String sourceUrl) { this.sourceUrl = sourceUrl; }
}
