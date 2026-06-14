package com.ezone.backend.dto.study;

import java.time.LocalDateTime;

public class StudyInviteDto {
    private String id;
    private String studyId;
    private String studyName;
    private String inviterEmail;
    private String status;
    private LocalDateTime invitedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getStudyId() { return studyId; }
    public void setStudyId(String studyId) { this.studyId = studyId; }
    public String getStudyName() { return studyName; }
    public void setStudyName(String studyName) { this.studyName = studyName; }
    public String getInviterEmail() { return inviterEmail; }
    public void setInviterEmail(String inviterEmail) { this.inviterEmail = inviterEmail; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalDateTime getInvitedAt() { return invitedAt; }
    public void setInvitedAt(LocalDateTime invitedAt) { this.invitedAt = invitedAt; }
}
