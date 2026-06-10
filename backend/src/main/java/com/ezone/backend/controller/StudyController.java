package com.ezone.backend.controller;

import com.ezone.backend.dto.study.*;
import com.ezone.backend.service.StudyService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/study")
public class StudyController {

    private final StudyService studyService;

    public StudyController(StudyService studyService) {
        this.studyService = studyService;
    }

    @PostMapping
    public ResponseEntity<StudyGroupDto> createStudy(Principal principal, @RequestBody CreateStudyRequest request) {
        String email = principal.getName();
        StudyGroupDto dto = studyService.createStudy(email, request);
        return ResponseEntity.ok(dto);
    }

    @GetMapping("/my")
    public ResponseEntity<List<StudyGroupDto>> listMyStudies(Principal principal) {
        String email = principal.getName();
        return ResponseEntity.ok(studyService.listMyStudies(email));
    }

    @PostMapping("/{studyId}/invite")
    public ResponseEntity<Void> inviteUser(Principal principal, @PathVariable String studyId, @RequestBody InviteUserRequest request) {
        studyService.inviteUser(principal.getName(), studyId, request);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{studyId}/essay")
    public ResponseEntity<Void> shareEssay(Principal principal, @PathVariable String studyId, @RequestBody ShareEssayRequest request) {
        studyService.shareEssay(principal.getName(), studyId, request);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/essay/{sharedEssayId}/feedback")
    public ResponseEntity<Void> addFeedback(Principal principal, @PathVariable String sharedEssayId, @RequestBody AddFeedbackRequest request) {
        studyService.addFeedback(principal.getName(), sharedEssayId, request);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{studyId}/job")
    public ResponseEntity<Void> recommendJob(Principal principal, @PathVariable String studyId, @RequestBody RecommendJobRequest request) {
        studyService.recommendJob(principal.getName(), studyId, request);
        return ResponseEntity.ok().build();
    }
}
