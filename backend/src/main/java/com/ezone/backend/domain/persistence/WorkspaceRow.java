package com.ezone.backend.domain.persistence;

import com.ezone.backend.domain.ApplicationStatus;
import java.math.BigDecimal;

public class WorkspaceRow {
    private Long id;
    private Long userId;
    private Long basketJobId;
    private String companyName;
    private String positionTitle;
    private String deadlineLabel;
    private ApplicationStatus applicationStatus;
    private String sourceUrl;
    private String companyDomain;
    private String companyType;
    private String companySize;
    private String companyLogoUrl;
    private BigDecimal companyRating;
    private Integer companyStartingSalary;
    private String companyFinancialStatus;
    private String companyIndustry;
    private Integer companyEmployeeCount;
    private String companyFoundedAt;
    private Long companyCapital;
    private Long companyRevenue;
    private String companyRepresentative;
    private String companyHomepage;
    private String companyBusiness;
    private String companyAddress;

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
    public String getCompanyDomain() { return companyDomain; }
    public void setCompanyDomain(String companyDomain) { this.companyDomain = companyDomain; }
    public String getCompanyType() { return companyType; }
    public void setCompanyType(String companyType) { this.companyType = companyType; }
    public String getCompanySize() { return companySize; }
    public void setCompanySize(String companySize) { this.companySize = companySize; }
    public String getCompanyLogoUrl() { return companyLogoUrl; }
    public void setCompanyLogoUrl(String companyLogoUrl) { this.companyLogoUrl = companyLogoUrl; }
    public BigDecimal getCompanyRating() { return companyRating; }
    public void setCompanyRating(BigDecimal companyRating) { this.companyRating = companyRating; }
    public Integer getCompanyStartingSalary() { return companyStartingSalary; }
    public void setCompanyStartingSalary(Integer companyStartingSalary) { this.companyStartingSalary = companyStartingSalary; }
    public String getCompanyFinancialStatus() { return companyFinancialStatus; }
    public void setCompanyFinancialStatus(String companyFinancialStatus) { this.companyFinancialStatus = companyFinancialStatus; }
    public String getCompanyIndustry() { return companyIndustry; }
    public void setCompanyIndustry(String companyIndustry) { this.companyIndustry = companyIndustry; }
    public Integer getCompanyEmployeeCount() { return companyEmployeeCount; }
    public void setCompanyEmployeeCount(Integer companyEmployeeCount) { this.companyEmployeeCount = companyEmployeeCount; }
    public String getCompanyFoundedAt() { return companyFoundedAt; }
    public void setCompanyFoundedAt(String companyFoundedAt) { this.companyFoundedAt = companyFoundedAt; }
    public Long getCompanyCapital() { return companyCapital; }
    public void setCompanyCapital(Long companyCapital) { this.companyCapital = companyCapital; }
    public Long getCompanyRevenue() { return companyRevenue; }
    public void setCompanyRevenue(Long companyRevenue) { this.companyRevenue = companyRevenue; }
    public String getCompanyRepresentative() { return companyRepresentative; }
    public void setCompanyRepresentative(String companyRepresentative) { this.companyRepresentative = companyRepresentative; }
    public String getCompanyHomepage() { return companyHomepage; }
    public void setCompanyHomepage(String companyHomepage) { this.companyHomepage = companyHomepage; }
    public String getCompanyBusiness() { return companyBusiness; }
    public void setCompanyBusiness(String companyBusiness) { this.companyBusiness = companyBusiness; }
    public String getCompanyAddress() { return companyAddress; }
    public void setCompanyAddress(String companyAddress) { this.companyAddress = companyAddress; }
}
