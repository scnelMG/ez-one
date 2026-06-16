package com.ezone.backend.domain.persistence;

import java.time.LocalDateTime;

public class StudyEssayReadLogRow {
    private String studyId;
    private String essayId;
    private String userEmail;
    private LocalDateTime readAt;

    public String getStudyId() { return studyId; }
    public void setStudyId(String studyId) { this.studyId = studyId; }
    public String getEssayId() { return essayId; }
    public void setEssayId(String essayId) { this.essayId = essayId; }
    public String getUserEmail() { return userEmail; }
    public void setUserEmail(String userEmail) { this.userEmail = userEmail; }
    public LocalDateTime getReadAt() { return readAt; }
    public void setReadAt(LocalDateTime readAt) { this.readAt = readAt; }
}
