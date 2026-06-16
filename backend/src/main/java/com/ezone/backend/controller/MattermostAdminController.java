package com.ezone.backend.controller;

import com.ezone.backend.dto.ApiResponse;
import com.ezone.backend.dto.mattermost.MattermostJobCandidateResponse;
import com.ezone.backend.dto.mattermost.MattermostReviewRequest;
import com.ezone.backend.service.MattermostIngestionService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/mattermost/job-candidates")
public class MattermostAdminController {

    private final MattermostIngestionService mattermostIngestionService;

    public MattermostAdminController(MattermostIngestionService mattermostIngestionService) {
        this.mattermostIngestionService = mattermostIngestionService;
    }

    @GetMapping
    public ApiResponse<List<MattermostJobCandidateResponse>> listCandidates(
        @RequestParam(defaultValue = "NEEDS_REVIEW") String status
    ) {
        return ApiResponse.success(mattermostIngestionService.listCandidates(status));
    }

    @PatchMapping("/{candidateId}/review")
    public ApiResponse<MattermostJobCandidateResponse> reviewCandidate(
        @PathVariable Long candidateId,
        @Valid @RequestBody MattermostReviewRequest request
    ) {
        return ApiResponse.success(mattermostIngestionService.reviewCandidate(
            candidateId,
            request.reviewStatus(),
            CurrentUserSupport.currentUserId()
        ));
    }
}
