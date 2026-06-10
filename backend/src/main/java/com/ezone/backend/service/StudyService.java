package com.ezone.backend.service;

import com.ezone.backend.domain.persistence.*;
import com.ezone.backend.dto.study.*;
import com.ezone.backend.mapper.StudyMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class StudyService {

    private final StudyMapper studyMapper;

    public StudyService(StudyMapper studyMapper) {
        this.studyMapper = studyMapper;
    }

    public StudyGroupDto createStudy(String userEmail, CreateStudyRequest request) {
        String studyId = UUID.randomUUID().toString();
        LocalDateTime now = LocalDateTime.now();

        StudyGroupRow group = new StudyGroupRow();
        group.setId(studyId);
        group.setName(request.getName());
        group.setDescription(request.getDescription());
        group.setCreatedBy(userEmail);
        group.setCreatedAt(now);
        group.setUpdatedAt(now);
        studyMapper.insertStudyGroup(group);

        StudyMemberRow member = new StudyMemberRow();
        member.setId(UUID.randomUUID().toString());
        member.setStudyId(studyId);
        member.setUserEmail(userEmail);
        member.setRole("LEADER");
        member.setJoinedAt(now);
        studyMapper.insertStudyMember(member);

        StudyGroupDto dto = new StudyGroupDto();
        dto.setId(group.getId());
        dto.setName(group.getName());
        dto.setDescription(group.getDescription());
        dto.setCreatedBy(group.getCreatedBy());
        dto.setCreatedAt(group.getCreatedAt());
        dto.setUpdatedAt(group.getUpdatedAt());
        return dto;
    }

    @Transactional(readOnly = true)
    public List<StudyGroupDto> listMyStudies(String userEmail) {
        return studyMapper.findStudyGroupsByUserEmail(userEmail).stream().map(g -> {
            StudyGroupDto dto = new StudyGroupDto();
            dto.setId(g.getId());
            dto.setName(g.getName());
            dto.setDescription(g.getDescription());
            dto.setCreatedBy(g.getCreatedBy());
            dto.setCreatedAt(g.getCreatedAt());
            dto.setUpdatedAt(g.getUpdatedAt());
            return dto;
        }).collect(Collectors.toList());
    }

    public void inviteUser(String inviterEmail, String studyId, InviteUserRequest request) {
        StudyInviteRow invite = new StudyInviteRow();
        invite.setId(UUID.randomUUID().toString());
        invite.setStudyId(studyId);
        invite.setInviterEmail(inviterEmail);
        invite.setInviteeEmail(request.getInviteeEmail());
        invite.setStatus("PENDING");
        invite.setInvitedAt(LocalDateTime.now());
        studyMapper.insertStudyInvite(invite);
    }

    public void shareEssay(String userEmail, String studyId, ShareEssayRequest request) {
        SharedEssayRow essay = new SharedEssayRow();
        essay.setId(UUID.randomUUID().toString());
        essay.setStudyId(studyId);
        essay.setUserEmail(userEmail);
        essay.setWorkspaceId(request.getWorkspaceId());
        essay.setVersionId(request.getVersionId());
        essay.setSharedAt(LocalDateTime.now());
        studyMapper.insertSharedEssay(essay);
    }

    public void addFeedback(String userEmail, String sharedEssayId, AddFeedbackRequest request) {
        EssayFeedbackRow feedback = new EssayFeedbackRow();
        feedback.setId(UUID.randomUUID().toString());
        feedback.setSharedEssayId(sharedEssayId);
        feedback.setAuthorEmail(userEmail);
        feedback.setContent(request.getContent());
        feedback.setCreatedAt(LocalDateTime.now());
        studyMapper.insertEssayFeedback(feedback);
    }

    public void recommendJob(String userEmail, String studyId, RecommendJobRequest request) {
        SharedJobRow job = new SharedJobRow();
        job.setId(UUID.randomUUID().toString());
        job.setStudyId(studyId);
        job.setRecommenderEmail(userEmail);
        job.setCompanyName(request.getCompanyName());
        job.setPositionTitle(request.getPositionTitle());
        job.setDeadlineLabel(request.getDeadlineLabel());
        job.setSourceUrl(request.getSourceUrl());
        job.setRecommendedAt(LocalDateTime.now());
        studyMapper.insertSharedJob(job);
    }
}
