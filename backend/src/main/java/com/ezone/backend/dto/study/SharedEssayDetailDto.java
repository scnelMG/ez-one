package com.ezone.backend.dto.study;

import java.time.LocalDateTime;
import java.util.List;

public class SharedEssayDetailDto {
    private String id;
    private String userEmail;
    private LocalDateTime sharedAt;
    private String companyName;
    private String positionTitle;
    private String deadlineLabel;
    
    private List<SharedEssayItemDto> items;
    private List<EssayFeedbackDto> feedbacks;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getUserEmail() { return userEmail; }
    public void setUserEmail(String userEmail) { this.userEmail = userEmail; }
    public LocalDateTime getSharedAt() { return sharedAt; }
    public void setSharedAt(LocalDateTime sharedAt) { this.sharedAt = sharedAt; }
    public String getCompanyName() { return companyName; }
    public void setCompanyName(String companyName) { this.companyName = companyName; }
    public String getPositionTitle() { return positionTitle; }
    public void setPositionTitle(String positionTitle) { this.positionTitle = positionTitle; }
    public String getDeadlineLabel() { return deadlineLabel; }
    public void setDeadlineLabel(String deadlineLabel) { this.deadlineLabel = deadlineLabel; }
    public List<SharedEssayItemDto> getItems() { return items; }
    public void setItems(List<SharedEssayItemDto> items) { this.items = items; }
    public List<EssayFeedbackDto> getFeedbacks() { return feedbacks; }
    public void setFeedbacks(List<EssayFeedbackDto> feedbacks) { this.feedbacks = feedbacks; }
}
