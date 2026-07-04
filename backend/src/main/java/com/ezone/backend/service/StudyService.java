package com.ezone.backend.service;

import com.ezone.backend.domain.persistence.*;
import com.ezone.backend.dto.study.*;
import com.ezone.backend.mapper.StudyMapper;
import com.ezone.backend.mapper.UserAccountMapper;
import com.ezone.backend.domain.UserAccount;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.util.StringUtils;

@Service
@Transactional
public class StudyService {

    private final StudyMapper studyMapper;
    private final UserAccountMapper userAccountMapper;
    private final EmailService emailService;
    private final P1WorkspaceService p1WorkspaceService;
    private final String publicBaseUrl;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public StudyService(
        StudyMapper studyMapper,
        UserAccountMapper userAccountMapper,
        EmailService emailService,
        P1WorkspaceService p1WorkspaceService,
        @Value("${app.public-base-url:http://localhost:5173}") String publicBaseUrl
    ) {
        this.studyMapper = studyMapper;
        this.userAccountMapper = userAccountMapper;
        this.emailService = emailService;
        this.p1WorkspaceService = p1WorkspaceService;
        this.publicBaseUrl = trimTrailingSlash(publicBaseUrl);
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
            List<StudyMemberDto> members = studyMapper.findMembersByStudyId(g.getId()).stream()
                .map(m -> {
                    StudyMemberDto mDto = new StudyMemberDto();
                    mDto.setId(m.getId());
                    mDto.setUserEmail(m.getUserEmail());
                    mDto.setRole(m.getRole());
                    mDto.setJoinedAt(m.getJoinedAt());
                    mDto.setUserName(m.getUserName());
                    mDto.setUserNickname(m.getUserNickname());
                    return mDto;
                }).collect(Collectors.toList());
            dto.setMembers(members);
            dto.setMemberCount(members.size());
            return dto;
        }).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public StudyGroupDto getStudyDetail(String studyId, String userEmail) {
        StudyGroupRow group = studyMapper.findStudyGroupById(studyId);
        if (group == null) {
            throw new RuntimeException("스터디를 찾을 수 없습니다.");
        }
        requireStudyMember(studyId, userEmail);
        StudyGroupDto dto = mapToDto(group);
        List<StudyMemberDto> members = studyMapper.findMembersByStudyId(studyId).stream()
            .map(m -> {
                int activeJobCount = studyMapper.countActiveJobsByUserEmail(m.getUserEmail());
                int notStartedCount = studyMapper.countNotStartedJobsByUserEmail(m.getUserEmail());
                int appsThisMonthCount = studyMapper.countJobsThisMonthByUserEmail(m.getUserEmail());
                int appsThisWeekCount = studyMapper.countJobsThisWeekByUserEmail(m.getUserEmail());
                int completedJobCount = studyMapper.countCompletedJobsByUserEmail(m.getUserEmail());
                int appsLastTwoWeeksCount = studyMapper.countCompletedJobsLastTwoWeeksByUserEmail(m.getUserEmail());

                StudyMemberDto mDto = new StudyMemberDto();
                mDto.setId(m.getId());
                mDto.setUserEmail(m.getUserEmail());
                mDto.setRole(m.getRole());
                mDto.setJoinedAt(m.getJoinedAt());
                mDto.setActiveJobCount(activeJobCount);
                mDto.setNotStartedCount(notStartedCount);
                mDto.setAppsThisMonthCount(appsThisMonthCount);
                mDto.setAppsThisWeekCount(appsThisWeekCount);
                mDto.setCompletedJobCount(completedJobCount);
                mDto.setAppsLastTwoWeeksCount(appsLastTwoWeeksCount);
                mDto.setUserName(m.getUserName());
                mDto.setUserNickname(m.getUserNickname());
                return mDto;
            }).collect(Collectors.toList());
        dto.setMembers(members);
        dto.setMemberCount(members.size());
        return dto;
    }

    @Transactional(readOnly = true)
    public List<SharedEssayDto> getSharedEssays(String studyId, String userEmail) {
        requireStudyMember(studyId, userEmail);
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
            dto.setUpdatedAt(e.getUpdatedAt());

            List<String> latestAddedVersionIds = parseVersionIds(e.getLatestAddedVersionIds());
            dto.setLatestAddedCount(latestAddedVersionIds.size());
            if (latestAddedVersionIds.isEmpty()) {
                dto.setLatestAddedQuestionNumbers(List.of());
            } else {
                dto.setLatestAddedQuestionNumbers(studyMapper.findEssayItemsByVersionIds(latestAddedVersionIds).stream()
                    .map(SharedEssayItemDto::getQuestionOrder)
                    .filter(order -> order != null)
                    .map(order -> order + 1)
                    .toList());
            }
            
            // 본인이 작성한 것이 아니고, 읽음 로그가 없으면 NEW
            boolean isMine = userEmail.equals(e.getUserEmail());
            boolean hasRead = studyMapper.countEssayReadLog(e.getId(), userEmail) > 0;
            dto.setIsNew(!isMine && !hasRead);

            return dto;
        }).collect(Collectors.toList());
    }

    public void readEssay(String studyId, String essayId, String userEmail) {
        requireStudyMember(studyId, userEmail);
        SharedEssayRow essay = studyMapper.findSharedEssayById(essayId);
        if (essay == null || !essay.getStudyId().equals(studyId)) {
            throw new IllegalArgumentException("Shared essay not found");
        }
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
    public List<SharedJobDto> getSharedJobs(String studyId, String userEmail) {
        requireStudyMember(studyId, userEmail);
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
        requireStudyLeader(studyId, inviterEmail);

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

    public void shareEssay(Long userId, String userEmail, String studyId, ShareEssayRequest request) {
        requireStudyMember(studyId, userEmail);
        p1WorkspaceService.getWorkspace(userId, parseWorkspaceId(request.getWorkspaceId()));

        List<String> incomingVersionIds = request.getVersionIds() == null ? List.of() : request.getVersionIds();
        if (incomingVersionIds.isEmpty()) {
            throw new IllegalArgumentException("공유할 자소서 버전을 선택해야 합니다.");
        }

        SharedEssayRow existing = studyMapper.findSharedEssayByStudyUserWorkspace(studyId, userEmail, request.getWorkspaceId());
        if (existing != null) {
            List<String> mergedVersionIds = mergeVersionsByQuestion(parseVersionIds(existing.getVersionIds()), incomingVersionIds);
            String mergedJson = writeVersionIds(mergedVersionIds);
            String latestJson = writeVersionIds(incomingVersionIds);
            studyMapper.updateSharedEssayVersions(existing.getId(), mergedJson, latestJson, LocalDateTime.now());
            studyMapper.deleteEssayReadLogsForEssayExceptUser(existing.getId(), userEmail);
            return;
        }

        SharedEssayRow essay = new SharedEssayRow();
        essay.setId(UUID.randomUUID().toString());
        essay.setStudyId(studyId);
        essay.setUserEmail(userEmail);
        essay.setWorkspaceId(request.getWorkspaceId());
        essay.setVersionIds(writeVersionIds(incomingVersionIds));
        essay.setLatestAddedVersionIds(writeVersionIds(incomingVersionIds));
        
        essay.setSharedAt(LocalDateTime.now());
        essay.setUpdatedAt(essay.getSharedAt());
        studyMapper.insertSharedEssay(essay);
    }

    public void addFeedback(String userEmail, String sharedEssayId, AddFeedbackRequest request) {
        SharedEssayRow sharedEssay = studyMapper.findSharedEssayById(sharedEssayId);
        if (sharedEssay == null) {
            throw new IllegalArgumentException("Shared essay not found");
        }
        requireStudyMember(sharedEssay.getStudyId(), userEmail);

        EssayFeedbackRow feedback = new EssayFeedbackRow();
        feedback.setId(UUID.randomUUID().toString());
        feedback.setSharedEssayId(sharedEssayId);
        feedback.setAuthorEmail(userEmail);
        feedback.setContent(request.getContent());
        feedback.setCreatedAt(LocalDateTime.now());
        studyMapper.insertEssayFeedback(feedback);
    }

    @Transactional(readOnly = true)
    public SharedEssayDetailDto getSharedEssayDetail(String studyId, String sharedEssayId, String userEmail) {
        requireStudyMember(studyId, userEmail);
        SharedEssayRow e = studyMapper.findSharedEssayById(sharedEssayId);
        if (e == null || !e.getStudyId().equals(studyId)) {
            throw new IllegalArgumentException("Shared essay not found");
        }
        
        SharedEssayDetailDto dto = new SharedEssayDetailDto();
        dto.setId(e.getId());
        dto.setUserEmail(e.getUserEmail());
        dto.setWorkspaceId(e.getWorkspaceId());
        dto.setSharedAt(e.getSharedAt());
        dto.setUpdatedAt(e.getUpdatedAt());
        dto.setCompanyName(e.getCompanyName());
        dto.setPositionTitle(e.getPositionTitle());
        dto.setDeadlineLabel(e.getDeadlineLabel());
        
        List<String> versionIds = parseVersionIds(e.getVersionIds());
        
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

    private List<String> parseVersionIds(String versionIdsJson) {
        if (versionIdsJson == null || versionIdsJson.isBlank()) {
            return List.of();
        }
        try {
            List<String> ids = objectMapper.readValue(versionIdsJson, new TypeReference<List<String>>() {});
            return ids == null ? List.of() : ids;
        } catch (JsonProcessingException ex) {
            return List.of();
        }
    }

    private String writeVersionIds(List<String> versionIds) {
        try {
            return objectMapper.writeValueAsString(versionIds == null ? List.of() : versionIds);
        } catch (JsonProcessingException e) {
            return "[]";
        }
    }

    private List<String> mergeVersionsByQuestion(List<String> existingVersionIds, List<String> incomingVersionIds) {
        Map<String, String> versionIdByQuestionId = new LinkedHashMap<>();
        for (SharedEssayItemDto item : findEssayItemsSafely(existingVersionIds)) {
            versionIdByQuestionId.put(item.getQuestionId(), item.getVersionId());
        }
        for (SharedEssayItemDto item : findEssayItemsSafely(incomingVersionIds)) {
            versionIdByQuestionId.put(item.getQuestionId(), item.getVersionId());
        }
        return new ArrayList<>(versionIdByQuestionId.values());
    }

    private List<SharedEssayItemDto> findEssayItemsSafely(List<String> versionIds) {
        if (versionIds == null || versionIds.isEmpty()) {
            return List.of();
        }
        return studyMapper.findEssayItemsByVersionIds(versionIds);
    }

    public void addEssayFeedback(String userEmail, String studyId, String sharedEssayId, AddFeedbackRequest request) {
        requireStudyMember(studyId, userEmail);
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
        requireStudyMember(studyId, userEmail);
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
        requireStudyLeader(studyId, userEmail);
        
        try {
            String fileName = java.util.UUID.randomUUID().toString() + "_" + sanitizeUploadFileName(file.getOriginalFilename());
            java.nio.file.Path uploadDir = java.nio.file.Paths.get("uploads", "study_images");
            if (!java.nio.file.Files.exists(uploadDir)) {
                java.nio.file.Files.createDirectories(uploadDir);
            }
            java.nio.file.Path filePath = uploadDir.resolve(fileName);
            java.nio.file.Files.copy(file.getInputStream(), filePath, java.nio.file.StandardCopyOption.REPLACE_EXISTING);

            String imageUrl = publicBaseUrl + "/uploads/study_images/" + fileName;
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

        deleteStudyCascade(studyId);
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
                deleteStudyCascade(studyId);
                return;
            }
            if (delegateEmail == null || delegateEmail.trim().isEmpty()) {
                throw new IllegalStateException("스터디장은 탈퇴 시 다른 멤버에게 권한을 위임해야 합니다.");
            }
            if (userEmail.equals(delegateEmail)) {
                throw new IllegalArgumentException("본인에게 스터디장 권한을 위임할 수 없습니다.");
            }
            StudyMemberRow newLeader = members.stream()
                .filter(m -> m.getUserEmail().equals(delegateEmail) && !m.getUserEmail().equals(userEmail))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("위임할 멤버를 찾을 수 없습니다."));
            
            studyMapper.updateStudyMemberRole(studyId, newLeader.getUserEmail(), "LEADER");
        }

        studyMapper.deleteStudyMember(studyId, userEmail);
    }

    private void deleteStudyCascade(String studyId) {
        studyMapper.deleteStudyEssayReadLogsByStudyId(studyId);
        studyMapper.deleteEssayFeedbacksByStudyId(studyId);
        studyMapper.deleteSharedEssaysByStudyId(studyId);
        studyMapper.deleteSharedJobsByStudyId(studyId);
        studyMapper.deleteStudyInvitesByStudyId(studyId);
        studyMapper.deleteStudyMembersByStudyId(studyId);
        studyMapper.deleteStudyGroup(studyId);
    }

    private StudyMemberRow requireStudyMember(String studyId, String userEmail) {
        return studyMapper.findMembersByStudyId(studyId).stream()
            .filter(member -> member.getUserEmail().equals(userEmail))
            .findFirst()
            .orElseThrow(() -> new ForbiddenResourceException("Study access denied."));
    }

    private StudyMemberRow requireStudyLeader(String studyId, String userEmail) {
        StudyMemberRow member = requireStudyMember(studyId, userEmail);
        if (!"LEADER".equals(member.getRole())) {
            throw new ForbiddenResourceException("Only the study leader can perform this action.");
        }
        return member;
    }

    private Long parseWorkspaceId(String workspaceId) {
        try {
            return Long.parseLong(workspaceId);
        } catch (NumberFormatException exception) {
            throw new IllegalArgumentException("Workspace not found");
        }
    }

    private String sanitizeUploadFileName(String originalFilename) {
        String cleanedName = StringUtils.cleanPath(originalFilename == null ? "study-image" : originalFilename);
        String fileName = java.nio.file.Paths.get(cleanedName).getFileName().toString();
        return fileName.replaceAll("[^A-Za-z0-9._-]", "_");
    }

    private String trimTrailingSlash(String value) {
        if (value == null || value.isBlank()) {
            return "http://localhost:5173";
        }
        return value.replaceAll("/+$", "");
    }
}
