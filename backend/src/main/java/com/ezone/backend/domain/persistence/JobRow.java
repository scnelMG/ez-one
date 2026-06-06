package com.ezone.backend.domain.persistence;

public class JobRow {
    private Long id;
    private Long companyId;
    private String companyName;
    private String companyDomain;
    private String companyType;
    private String companySize;
    private String companyLogoUrl;
    private String logoSourceUrl;
    private String logoStatus;
    private String positionTitle;
    private String deadlineLabel;
    private String sourceUrl;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getCompanyId() { return companyId; }
    public void setCompanyId(Long companyId) { this.companyId = companyId; }
    public String getCompanyName() { return companyName; }
    public void setCompanyName(String companyName) { this.companyName = companyName; }
    public String getCompanyDomain() { return companyDomain; }
    public void setCompanyDomain(String companyDomain) { this.companyDomain = companyDomain; }
    public String getCompanyType() { return companyType; }
    public void setCompanyType(String companyType) { this.companyType = companyType; }
    public String getCompanySize() { return companySize; }
    public void setCompanySize(String companySize) { this.companySize = companySize; }
    public String getCompanyLogoUrl() { return companyLogoUrl; }
    public void setCompanyLogoUrl(String companyLogoUrl) { this.companyLogoUrl = companyLogoUrl; }
    public String getLogoSourceUrl() { return logoSourceUrl; }
    public void setLogoSourceUrl(String logoSourceUrl) { this.logoSourceUrl = logoSourceUrl; }
    public String getLogoStatus() { return logoStatus; }
    public void setLogoStatus(String logoStatus) { this.logoStatus = logoStatus; }
    public String getPositionTitle() { return positionTitle; }
    public void setPositionTitle(String positionTitle) { this.positionTitle = positionTitle; }
    public String getDeadlineLabel() { return deadlineLabel; }
    public void setDeadlineLabel(String deadlineLabel) { this.deadlineLabel = deadlineLabel; }
    public String getSourceUrl() { return sourceUrl; }
    public void setSourceUrl(String sourceUrl) { this.sourceUrl = sourceUrl; }
}
