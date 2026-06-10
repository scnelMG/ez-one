package com.ezone.backend.domain.persistence;

import java.time.LocalDateTime;

public class StudyMemberRow {
    private String id;
    private String studyId;
    private String userEmail;
    private String role;
    private LocalDateTime joinedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getStudyId() { return studyId; }
    public void setStudyId(String studyId) { this.studyId = studyId; }
    public String getUserEmail() { return userEmail; }
    public void setUserEmail(String userEmail) { this.userEmail = userEmail; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public LocalDateTime getJoinedAt() { return joinedAt; }
    public void setJoinedAt(LocalDateTime joinedAt) { this.joinedAt = joinedAt; }
}
