package com.ezone.backend.dto.study;

public class RecommendJobRequest {
    private String companyName;
    private String positionTitle;
    private String deadlineLabel;
    private String sourceUrl;

    public String getCompanyName() { return companyName; }
    public void setCompanyName(String companyName) { this.companyName = companyName; }
    public String getPositionTitle() { return positionTitle; }
    public void setPositionTitle(String positionTitle) { this.positionTitle = positionTitle; }
    public String getDeadlineLabel() { return deadlineLabel; }
    public void setDeadlineLabel(String deadlineLabel) { this.deadlineLabel = deadlineLabel; }
    public String getSourceUrl() { return sourceUrl; }
    public void setSourceUrl(String sourceUrl) { this.sourceUrl = sourceUrl; }
}
