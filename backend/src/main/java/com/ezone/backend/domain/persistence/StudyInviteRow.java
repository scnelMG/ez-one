package com.ezone.backend.domain.persistence;

import java.time.LocalDateTime;

public class StudyInviteRow {
    private String id;
    private String studyId;
    private String inviterEmail;
    private String inviteeEmail;
    private String status;
    private LocalDateTime invitedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getStudyId() { return studyId; }
    public void setStudyId(String studyId) { this.studyId = studyId; }
    public String getInviterEmail() { return inviterEmail; }
    public void setInviterEmail(String inviterEmail) { this.inviterEmail = inviterEmail; }
    public String getInviteeEmail() { return inviteeEmail; }
    public void setInviteeEmail(String inviteeEmail) { this.inviteeEmail = inviteeEmail; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalDateTime getInvitedAt() { return invitedAt; }
    public void setInvitedAt(LocalDateTime invitedAt) { this.invitedAt = invitedAt; }
}
