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
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;

@Service
@Transactional
public class StudyService {

    private final StudyMapper studyMapper;
    private final EmailService emailService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public StudyService(StudyMapper studyMapper, EmailService emailService) {
        this.studyMapper = studyMapper;
        this.emailService = emailService;
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
            StudyGroupDto dto = mapToDto(g);
            List<StudyMemberRow> members = studyMapper.findMembersByStudyId(g.getId());
            dto.setMemberCount(members.size());
            return dto;
        }).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public StudyGroupDto getStudyDetail(String studyId) {
        StudyGroupRow group = studyMapper.findStudyGroupById(studyId);
        if (group == null) {
            throw new RuntimeException("스터디를 찾을 수 없습니다.");
        }
        StudyGroupDto dto = mapToDto(group);
        List<StudyMemberDto> members = studyMapper.findMembersByStudyId(studyId).stream().map(m -> {
            StudyMemberDto mDto = new StudyMemberDto();
            mDto.setId(m.getId());
            mDto.setUserEmail(m.getUserEmail());
            mDto.setRole(m.getRole());
            mDto.setJoinedAt(m.getJoinedAt());
            mDto.setActiveJobCount(0); // Optional: calculate later
            return mDto;
        }).collect(Collectors.toList());
        dto.setMembers(members);
        dto.setMemberCount(members.size());
        return dto;
    }

    @Transactional(readOnly = true)
    public List<SharedEssayDto> getSharedEssays(String studyId) {
        return studyMapper.findSharedEssaysByStudyId(studyId).stream().map(e -> {
            SharedEssayDto dto = new SharedEssayDto();
            dto.setId(e.getId());
            dto.setStudyId(e.getStudyId());
            dto.setUserEmail(e.getUserEmail());
            dto.setWorkspaceId(e.getWorkspaceId());
            
            try {
                if (e.getVersionIds() != null) {
                    List<String> versionIds = objectMapper.readValue(e.getVersionIds(), new TypeReference<List<String>>() {});
                    dto.setVersionIds(versionIds);
                } else {
                    dto.setVersionIds(List.of());
                }
            } catch (JsonProcessingException ex) {
                dto.setVersionIds(List.of());
            }
            
            dto.setSharedAt(e.getSharedAt());
            dto.setCompanyName(e.getCompanyName());
            dto.setPositionTitle(e.getPositionTitle());
            dto.setDeadlineLabel(e.getDeadlineLabel());
            return dto;
        }).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SharedJobDto> getSharedJobs(String studyId) {
        return studyMapper.findSharedJobsByStudyId(studyId).stream().map(j -> {
            SharedJobDto dto = new SharedJobDto();
            dto.setId(j.getId());
            dto.setStudyId(j.getStudyId());
            dto.setRecommenderEmail(j.getRecommenderEmail());
            dto.setCompanyName(j.getCompanyName());
            dto.setPositionTitle(j.getPositionTitle());
            dto.setDeadlineLabel(j.getDeadlineLabel());
            dto.setSourceUrl(j.getSourceUrl());
            dto.setRecommendedAt(j.getRecommendedAt());
            return dto;
        }).collect(Collectors.toList());
    }

    private StudyGroupDto mapToDto(StudyGroupRow group) {
        StudyGroupDto dto = new StudyGroupDto();
        dto.setId(group.getId());
        dto.setName(group.getName());
        dto.setDescription(group.getDescription());
        dto.setCreatedBy(group.getCreatedBy());
        dto.setCreatedAt(group.getCreatedAt());
        dto.setUpdatedAt(group.getUpdatedAt());
        return dto;
    }

    public void inviteUser(String inviterEmail, String studyId, InviteUserRequest request) {
        StudyGroupRow study = studyMapper.findStudyGroupById(studyId);
        if (study == null) {
            throw new IllegalArgumentException("Study not found");
        }

        StudyInviteRow invite = new StudyInviteRow();
        invite.setId(UUID.randomUUID().toString());
        invite.setStudyId(studyId);
        invite.setInviterEmail(inviterEmail);
        invite.setInviteeEmail(request.getInviteeEmail());
        invite.setStatus("PENDING");
        invite.setInvitedAt(LocalDateTime.now());
        studyMapper.insertStudyInvite(invite);
        
        // 실제 이메일 비동기 발송
        emailService.sendStudyInviteEmail(request.getInviteeEmail(), study.getName());
    }

    public void shareEssay(String userEmail, String studyId, ShareEssayRequest request) {
        SharedEssayRow essay = new SharedEssayRow();
        essay.setId(UUID.randomUUID().toString());
        essay.setStudyId(studyId);
        essay.setUserEmail(userEmail);
        essay.setWorkspaceId(request.getWorkspaceId());
        
        try {
            String json = objectMapper.writeValueAsString(request.getVersionIds());
            essay.setVersionIds(json);
        } catch (JsonProcessingException e) {
            essay.setVersionIds("[]");
        }
        
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

    @Transactional(readOnly = true)
    public SharedEssayDetailDto getSharedEssayDetail(String studyId, String sharedEssayId) {
        SharedEssayRow e = studyMapper.findSharedEssayById(sharedEssayId);
        if (e == null || !e.getStudyId().equals(studyId)) {
            throw new IllegalArgumentException("Shared essay not found");
        }
        
        SharedEssayDetailDto dto = new SharedEssayDetailDto();
        dto.setId(e.getId());
        dto.setUserEmail(e.getUserEmail());
        dto.setSharedAt(e.getSharedAt());
        dto.setCompanyName(e.getCompanyName());
        dto.setPositionTitle(e.getPositionTitle());
        dto.setDeadlineLabel(e.getDeadlineLabel());
        
        List<String> versionIds = List.of();
        try {
            if (e.getVersionIds() != null) {
                versionIds = objectMapper.readValue(e.getVersionIds(), new TypeReference<List<String>>() {});
            }
        } catch (JsonProcessingException ex) {
            // ignore
        }
        
        if (versionIds.isEmpty()) {
            dto.setItems(List.of());
        } else {
            List<SharedEssayItemDto> items = studyMapper.findEssayItemsByVersionIds(versionIds);
            dto.setItems(items);
        }
        
        List<EssayFeedbackRow> feedbackRows = studyMapper.findFeedbackBySharedEssayId(sharedEssayId);
        List<EssayFeedbackDto> feedbacks = feedbackRows.stream().map(f -> {
            EssayFeedbackDto fdto = new EssayFeedbackDto();
            fdto.setId(f.getId());
            fdto.setAuthorEmail(f.getAuthorEmail());
            fdto.setContent(f.getContent());
            fdto.setCreatedAt(f.getCreatedAt());
            return fdto;
        }).collect(Collectors.toList());
        dto.setFeedbacks(feedbacks);
        
        return dto;
    }

    public void addEssayFeedback(String userEmail, String studyId, String sharedEssayId, AddFeedbackRequest request) {
        SharedEssayRow e = studyMapper.findSharedEssayById(sharedEssayId);
        if (e == null || !e.getStudyId().equals(studyId)) {
            throw new IllegalArgumentException("Shared essay not found");
        }
        
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
