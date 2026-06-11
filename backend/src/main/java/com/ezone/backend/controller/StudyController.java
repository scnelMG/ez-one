package com.ezone.backend.controller;

import com.ezone.backend.dto.study.*;
import com.ezone.backend.service.StudyService;
import com.ezone.backend.security.JwtAuthenticatedUser;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/study")
public class StudyController {

    private final StudyService studyService;

    public StudyController(StudyService studyService) {
        this.studyService = studyService;
    }

    @PostMapping
    public ResponseEntity<StudyGroupDto> createStudy(@AuthenticationPrincipal JwtAuthenticatedUser user, @RequestBody CreateStudyRequest request) {
        String email = user.email();
        StudyGroupDto dto = studyService.createStudy(email, request);
        return ResponseEntity.ok(dto);
    }

    @GetMapping("/my")
    public ResponseEntity<List<StudyGroupDto>> listMyStudies(@AuthenticationPrincipal JwtAuthenticatedUser user) {
        String email = user.email();
        return ResponseEntity.ok(studyService.listMyStudies(email));
    }

    @GetMapping("/{studyId}")
    public ResponseEntity<StudyGroupDto> getStudyDetail(@PathVariable String studyId) {
        return ResponseEntity.ok(studyService.getStudyDetail(studyId));
    }

    @GetMapping("/{studyId}/essays")
    public ResponseEntity<List<SharedEssayDto>> getSharedEssays(@PathVariable String studyId) {
        return ResponseEntity.ok(studyService.getSharedEssays(studyId));
    }

    @GetMapping("/{studyId}/jobs")
    public ResponseEntity<List<SharedJobDto>> getSharedJobs(@PathVariable String studyId) {
        return ResponseEntity.ok(studyService.getSharedJobs(studyId));
    }

    @PostMapping("/{studyId}/invite")
    public ResponseEntity<Void> inviteUser(@AuthenticationPrincipal JwtAuthenticatedUser user, @PathVariable String studyId, @RequestBody InviteUserRequest request) {
        studyService.inviteUser(user.email(), studyId, request);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{studyId}/essay")
    public ResponseEntity<Void> shareEssay(@AuthenticationPrincipal JwtAuthenticatedUser user, @PathVariable String studyId, @RequestBody ShareEssayRequest request) {
        studyService.shareEssay(user.email(), studyId, request);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/essay/{sharedEssayId}/feedback")
    public ResponseEntity<Void> addFeedback(@AuthenticationPrincipal JwtAuthenticatedUser user, @PathVariable String sharedEssayId, @RequestBody AddFeedbackRequest request) {
        studyService.addFeedback(user.email(), sharedEssayId, request);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{studyId}/essay/{sharedEssayId}")
    public ResponseEntity<SharedEssayDetailDto> getSharedEssayDetail(
            @PathVariable String studyId,
            @PathVariable String sharedEssayId) {
        return ResponseEntity.ok(studyService.getSharedEssayDetail(studyId, sharedEssayId));
    }

    @PostMapping("/{studyId}/essay/{sharedEssayId}/feedback")
    public ResponseEntity<Void> addEssayFeedback(
            @AuthenticationPrincipal JwtAuthenticatedUser user,
            @PathVariable String studyId,
            @PathVariable String sharedEssayId,
            @RequestBody AddFeedbackRequest request) {
        String email = user != null ? user.email() : "test@test.com";
        studyService.addEssayFeedback(email, studyId, sharedEssayId, request);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{studyId}/job")
    public ResponseEntity<Void> recommendJob(@AuthenticationPrincipal JwtAuthenticatedUser user, @PathVariable String studyId, @RequestBody RecommendJobRequest request) {
        studyService.recommendJob(user.email(), studyId, request);
        return ResponseEntity.ok().build();
    }
}
