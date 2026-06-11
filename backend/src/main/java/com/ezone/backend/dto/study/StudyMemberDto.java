package com.ezone.backend.dto.study;

import java.time.LocalDateTime;

public class StudyMemberDto {
    private String id;
    private String userEmail;
    private String role;
    private LocalDateTime joinedAt;
    private int activeJobCount; // To support frontend's activeJobCount

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getUserEmail() { return userEmail; }
    public void setUserEmail(String userEmail) { this.userEmail = userEmail; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public LocalDateTime getJoinedAt() { return joinedAt; }
    public void setJoinedAt(LocalDateTime joinedAt) { this.joinedAt = joinedAt; }
    public int getActiveJobCount() { return activeJobCount; }
    public void setActiveJobCount(int activeJobCount) { this.activeJobCount = activeJobCount; }
}
