package com.ezone.backend.domain.persistence;

public class MattermostParsedJobPostRow {
    private Long id;
    private Long messageId;
    private String companyName;
    private String title;
    private String url;
    private String deadlineLabel;
    private String reviewStatus;
    private Long reviewerUserId;
    private Long promotedJobId;
    private String postedAt;
    private String receivedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getMessageId() { return messageId; }
    public void setMessageId(Long messageId) { this.messageId = messageId; }
    public String getCompanyName() { return companyName; }
    public void setCompanyName(String companyName) { this.companyName = companyName; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }
    public String getDeadlineLabel() { return deadlineLabel; }
    public void setDeadlineLabel(String deadlineLabel) { this.deadlineLabel = deadlineLabel; }
    public String getReviewStatus() { return reviewStatus; }
    public void setReviewStatus(String reviewStatus) { this.reviewStatus = reviewStatus; }
    public Long getReviewerUserId() { return reviewerUserId; }
    public void setReviewerUserId(Long reviewerUserId) { this.reviewerUserId = reviewerUserId; }
    public Long getPromotedJobId() { return promotedJobId; }
    public void setPromotedJobId(Long promotedJobId) { this.promotedJobId = promotedJobId; }
    public String getPostedAt() { return postedAt; }
    public void setPostedAt(String postedAt) { this.postedAt = postedAt; }
    public String getReceivedAt() { return receivedAt; }
    public void setReceivedAt(String receivedAt) { this.receivedAt = receivedAt; }
}
