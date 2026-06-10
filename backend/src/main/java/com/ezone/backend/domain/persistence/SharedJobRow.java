package com.ezone.backend.domain.persistence;

import java.time.LocalDateTime;

public class SharedJobRow {
    private String id;
    private String studyId;
    private String recommenderEmail;
    private String companyName;
    private String positionTitle;
    private String deadlineLabel;
    private String sourceUrl;
    private LocalDateTime recommendedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getStudyId() { return studyId; }
    public void setStudyId(String studyId) { this.studyId = studyId; }
    public String getRecommenderEmail() { return recommenderEmail; }
    public void setRecommenderEmail(String recommenderEmail) { this.recommenderEmail = recommenderEmail; }
    public String getCompanyName() { return companyName; }
    public void setCompanyName(String companyName) { this.companyName = companyName; }
    public String getPositionTitle() { return positionTitle; }
    public void setPositionTitle(String positionTitle) { this.positionTitle = positionTitle; }
    public String getDeadlineLabel() { return deadlineLabel; }
    public void setDeadlineLabel(String deadlineLabel) { this.deadlineLabel = deadlineLabel; }
    public String getSourceUrl() { return sourceUrl; }
    public void setSourceUrl(String sourceUrl) { this.sourceUrl = sourceUrl; }
    public LocalDateTime getRecommendedAt() { return recommendedAt; }
    public void setRecommendedAt(LocalDateTime recommendedAt) { this.recommendedAt = recommendedAt; }
}
