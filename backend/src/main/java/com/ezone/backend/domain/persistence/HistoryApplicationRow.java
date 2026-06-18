package com.ezone.backend.domain.persistence;

import com.ezone.backend.domain.ApplicationStatus;
import com.ezone.backend.domain.HistoryResultStage;

public class HistoryApplicationRow {
    private Long id;
    private Long userId;
    private Long workspaceId;
    private String companyName;
    private String positionTitle;
    private ApplicationStatus applicationStatus;
    private HistoryResultStage resultStage;
    private String resultLabel;
    private String rawResult;
    private String deadlineLabel;
    private String periodKey;
    private Integer periodYear;
    private String periodHalf;
    private String sourceUrl;
    private String companyLogoUrl;
    private String companyType;
    private String companyIndustry;
    private String companyDataSource;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public Long getWorkspaceId() {
        return workspaceId;
    }

    public void setWorkspaceId(Long workspaceId) {
        this.workspaceId = workspaceId;
    }

    public String getCompanyName() {
        return companyName;
    }

    public void setCompanyName(String companyName) {
        this.companyName = companyName;
    }

    public String getPositionTitle() {
        return positionTitle;
    }

    public void setPositionTitle(String positionTitle) {
        this.positionTitle = positionTitle;
    }

    public ApplicationStatus getApplicationStatus() {
        return applicationStatus;
    }

    public void setApplicationStatus(ApplicationStatus applicationStatus) {
        this.applicationStatus = applicationStatus;
    }

    public HistoryResultStage getResultStage() {
        return resultStage;
    }

    public void setResultStage(HistoryResultStage resultStage) {
        this.resultStage = resultStage;
    }

    public String getResultLabel() {
        return resultLabel;
    }

    public void setResultLabel(String resultLabel) {
        this.resultLabel = resultLabel;
    }

    public String getRawResult() {
        return rawResult;
    }

    public void setRawResult(String rawResult) {
        this.rawResult = rawResult;
    }

    public String getDeadlineLabel() {
        return deadlineLabel;
    }

    public void setDeadlineLabel(String deadlineLabel) {
        this.deadlineLabel = deadlineLabel;
    }

    public String getPeriodKey() {
        return periodKey;
    }

    public void setPeriodKey(String periodKey) {
        this.periodKey = periodKey;
    }

    public Integer getPeriodYear() {
        return periodYear;
    }

    public void setPeriodYear(Integer periodYear) {
        this.periodYear = periodYear;
    }

    public String getPeriodHalf() {
        return periodHalf;
    }

    public void setPeriodHalf(String periodHalf) {
        this.periodHalf = periodHalf;
    }

    public String getSourceUrl() {
        return sourceUrl;
    }

    public void setSourceUrl(String sourceUrl) {
        this.sourceUrl = sourceUrl;
    }

    public String getCompanyLogoUrl() {
        return companyLogoUrl;
    }

    public void setCompanyLogoUrl(String companyLogoUrl) {
        this.companyLogoUrl = companyLogoUrl;
    }

    public String getCompanyType() {
        return companyType;
    }

    public void setCompanyType(String companyType) {
        this.companyType = companyType;
    }

    public String getCompanyIndustry() {
        return companyIndustry;
    }

    public void setCompanyIndustry(String companyIndustry) {
        this.companyIndustry = companyIndustry;
    }

    public String getCompanyDataSource() {
        return companyDataSource;
    }

    public void setCompanyDataSource(String companyDataSource) {
        this.companyDataSource = companyDataSource;
    }
}
