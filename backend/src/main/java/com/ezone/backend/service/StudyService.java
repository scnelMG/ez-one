package com.ezone.backend.service;

import com.ezone.backend.domain.persistence.*;
import com.ezone.backend.dto.study.*;
import com.ezone.backend.mapper.StudyMapper;
import com.ezone.backend.mapper.UserAccountMapper;
import com.ezone.backend.domain.UserAccount;
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
    private final UserAccountMapper userAccountMapper;
    private final EmailService emailService;
    private final P1WorkspaceService p1WorkspaceService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public StudyService(StudyMapper studyMapper, UserAccountMapper userAccountMapper, EmailService emailService, P1WorkspaceService p1WorkspaceService) {
        this.studyMapper = studyMapper;
        this.userAccountMapper = userAccountMapper;
        this.emailService = emailService;
        this.p1WorkspaceService = p1WorkspaceService;
    }

    public UserSearchDto searchUserByEmail(String email) {
        return userAccountMapper.findByEmail(email)
            .map(user -> new UserSearchDto(user.email(), user.name(), user.nickname()))
            .orElse(null);
    }

    public StudyGroupDto createStudy(String userEmail, CreateStudyRequest request) {
        String studyId = UUID.randomUUID().toString();
        LocalDateTime now = LocalDateTime.now();

        StudyGroupRow group = new StudyGroupRow();
        group.setId(studyId);
        group.setName(request.getName());
        group.setDescription(request.getDescription());
        group.setSettingsJson(request.getSettingsJson());
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
        dto.setSettingsJson(group.getSettingsJson());
        dto.setImageUrl(group.getImageUrl());
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
        List<StudyMemberDto> members = studyMapper.findMembersByStudyId(studyId).stream()
            .map(m -> {
                int activeJobCount = studyMapper.countActiveJobsByUserEmail(m.getUserEmail());
                int notStartedCount = studyMapper.countNotStartedJobsByUserEmail(m.getUserEmail());
                int appsThisMonthCount = studyMapper.countJobsThisMonthByUserEmail(m.getUserEmail());
                int appsThisWeekCount = studyMapper.countJobsThisWeekByUserEmail(m.getUserEmail());

                StudyMemberDto mDto = new StudyMemberDto();
                mDto.setId(m.getId());
                mDto.setUserEmail(m.getUserEmail());
                mDto.setRole(m.getRole());
                mDto.setJoinedAt(m.getJoinedAt());
                mDto.setActiveJobCount(activeJobCount);
                mDto.setNotStartedCount(notStartedCount);
                mDto.setAppsThisMonthCount(appsThisMonthCount);
                mDto.setAppsThisWeekCount(appsThisWeekCount);
                mDto.setUserName(m.getUserName());
                mDto.setUserNickname(m.getUserNickname());
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
            
            // 본인이 작성한 것이 아니고, 읽음 로그가 없으면 NEW
            String currentUserEmail = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
            boolean isMine = currentUserEmail.equals(e.getUserEmail());
            boolean hasRead = studyMapper.countEssayReadLog(e.getId(), currentUserEmail) > 0;
            dto.setIsNew(!isMine && !hasRead);

            return dto;
        }).collect(Collectors.toList());
    }

    public void readEssay(String studyId, String essayId, String userEmail) {
        StudyEssayReadLogRow row = new StudyEssayReadLogRow();
        row.setStudyId(studyId);
        row.setEssayId(essayId);
        row.setUserEmail(userEmail);
        row.setReadAt(LocalDateTime.now());
        try {
            studyMapper.insertEssayReadLog(row);
        } catch (org.springframework.dao.DuplicateKeyException e) {
            // Already read
        }
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
            dto.setDeadlineDate(j.getDeadlineDate());
            dto.setReason(j.getReason());
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
        dto.setSettingsJson(group.getSettingsJson());
        dto.setImageUrl(group.getImageUrl());
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
    }

    @Transactional(readOnly = true)
    public List<StudyInviteDto> listMyInvites(String email) {
        return studyMapper.findInvitesByInviteeEmail(email).stream().map(i -> {
            StudyInviteDto dto = new StudyInviteDto();
            dto.setId(i.getId());
            dto.setStudyId(i.getStudyId());
            dto.setStudyName(i.getStudyName());
            dto.setInviterEmail(i.getInviterEmail());
            dto.setStatus(i.getStatus());
            dto.setInvitedAt(i.getInvitedAt());
            return dto;
        }).collect(Collectors.toList());
    }

    public void respondToInvite(String email, String inviteId, boolean accept) {
        StudyInviteRow invite = studyMapper.findStudyInviteById(inviteId);
        if (invite == null || !invite.getInviteeEmail().equals(email) || !"PENDING".equals(invite.getStatus())) {
            throw new IllegalArgumentException("Invalid invite");
        }

        if (accept) {
            studyMapper.updateStudyInviteStatus(inviteId, "ACCEPTED");
            StudyMemberRow member = new StudyMemberRow();
            member.setId(UUID.randomUUID().toString());
            member.setStudyId(invite.getStudyId());
            member.setUserEmail(email);
            member.setRole("MEMBER");
            member.setJoinedAt(LocalDateTime.now());
            studyMapper.insertStudyMember(member);
        } else {
            studyMapper.updateStudyInviteStatus(inviteId, "DECLINED");
        }
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
        SharedJobRow row = new SharedJobRow();
        row.setId(UUID.randomUUID().toString());
        row.setStudyId(studyId);
        row.setRecommenderEmail(userEmail);
        row.setCompanyName(request.getCompanyName());
        row.setPositionTitle(request.getPositionTitle());
        row.setDeadlineLabel(request.getDeadlineLabel());
        row.setDeadlineDate(request.getDeadlineDate());
        row.setSourceUrl(request.getSourceUrl());
        row.setReason(request.getReason());
        row.setRecommendedAt(LocalDateTime.now());

        studyMapper.insertSharedJob(row);

    }

    public void uploadStudyImage(String studyId, org.springframework.web.multipart.MultipartFile file, String userEmail) {
        StudyGroupRow study = studyMapper.findStudyGroupById(studyId);
        if (study == null) {
            throw new IllegalArgumentException("스터디를 찾을 수 없습니다.");
        }
        
        try {
            String fileName = java.util.UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
            java.nio.file.Path uploadDir = java.nio.file.Paths.get("uploads", "study_images");
            if (!java.nio.file.Files.exists(uploadDir)) {
                java.nio.file.Files.createDirectories(uploadDir);
            }
            java.nio.file.Path filePath = uploadDir.resolve(fileName);
            java.nio.file.Files.copy(file.getInputStream(), filePath, java.nio.file.StandardCopyOption.REPLACE_EXISTING);

            String imageUrl = "http://localhost:8080/uploads/study_images/" + fileName;
            studyMapper.updateStudyImageUrl(studyId, imageUrl);
        } catch (java.io.IOException e) {
            throw new RuntimeException("이미지 업로드에 실패했습니다.", e);
        }
    }

    @org.springframework.transaction.annotation.Transactional
    public void deleteStudy(String studyId, String userEmail) {
        StudyGroupRow study = studyMapper.findStudyGroupById(studyId);
        if (study == null) {
            throw new IllegalArgumentException("스터디를 찾을 수 없습니다.");
        }
        
        List<StudyMemberRow> members = studyMapper.findMembersByStudyId(studyId);
        StudyMemberRow me = members.stream()
            .filter(m -> m.getUserEmail().equals(userEmail))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("해당 스터디의 멤버가 아닙니다."));

        if (!"LEADER".equals(me.getRole())) {
            throw new IllegalStateException("스터디장만 스터디를 삭제할 수 있습니다.");
        }

        studyMapper.deleteStudyGroup(studyId);
    }

    @org.springframework.transaction.annotation.Transactional
    public void leaveStudy(String studyId, String userEmail, String delegateEmail) {
        StudyGroupRow study = studyMapper.findStudyGroupById(studyId);
        if (study == null) {
            throw new IllegalArgumentException("스터디를 찾을 수 없습니다.");
        }
        
        List<StudyMemberRow> members = studyMapper.findMembersByStudyId(studyId);
        StudyMemberRow me = members.stream()
            .filter(m -> m.getUserEmail().equals(userEmail))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("해당 스터디의 멤버가 아닙니다."));

        if ("LEADER".equals(me.getRole())) {
            if (members.size() == 1) {
                studyMapper.deleteStudyGroup(studyId);
                return;
            }
            if (delegateEmail == null || delegateEmail.trim().isEmpty()) {
                throw new IllegalStateException("스터디장은 탈퇴 시 다른 멤버에게 권한을 위임해야 합니다.");
            }
            StudyMemberRow newLeader = members.stream()
                .filter(m -> m.getUserEmail().equals(delegateEmail))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("위임할 멤버를 찾을 수 없습니다."));
            
            studyMapper.updateStudyMemberRole(studyId, newLeader.getUserEmail(), "LEADER");
        }

        studyMapper.deleteStudyMember(studyId, userEmail);
    }
}
