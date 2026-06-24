package com.ezone.backend.controller;

import com.ezone.backend.dto.ApiResponse;
import com.ezone.backend.dto.basket.BasketJobResponse;
import com.ezone.backend.dto.dashboard.DashboardJobResponse;
import com.ezone.backend.service.ForbiddenResourceException;
import com.ezone.backend.service.MattermostRecommendationService;
import com.ezone.backend.service.P1WorkspaceService;
import com.ezone.backend.service.ProfileService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/recommendations/jobs")
public class RecommendationController {

    private final P1WorkspaceService workspaceService;
    private final ProfileService profileService;
    private final MattermostRecommendationService mattermostRecommendationService;

    public RecommendationController(
        P1WorkspaceService workspaceService,
        ProfileService profileService,
        MattermostRecommendationService mattermostRecommendationService
    ) {
        this.workspaceService = workspaceService;
        this.profileService = profileService;
        this.mattermostRecommendationService = mattermostRecommendationService;
    }

    @GetMapping
    public ApiResponse<List<DashboardJobResponse>> listRecommendations(
        @RequestParam(name = "source", defaultValue = "recommendation") String source,
        @RequestParam(name = "deadlineMode", defaultValue = "open") String deadlineMode
    ) {
        Long userId = CurrentUserSupport.currentUserId();
        requireSsafyForMattermost(userId, source);
        if (isMattermostSource(source)) {
            return ApiResponse.success(mattermostRecommendationService.listRecommendations(userId, deadlineMode));
        }
        return ApiResponse.success(workspaceService.listRecommendationJobs(userId, source));
    }

    @PostMapping("/{recommendationId}/save")
    public ApiResponse<BasketJobResponse> saveRecommendation(
        @PathVariable Long recommendationId,
        @RequestParam(name = "source", defaultValue = "recommendation") String source
    ) {
        Long userId = CurrentUserSupport.currentUserId();
        requireSsafyForMattermost(userId, source);
        if (isMattermostSource(source)) {
            return ApiResponse.success(mattermostRecommendationService.saveRecommendation(userId, recommendationId));
        }
        return ApiResponse.success(workspaceService.saveRecommendation(
            userId,
            recommendationId,
            source
        ));
    }

    private void requireSsafyForMattermost(Long userId, String source) {
        if (!isMattermostSource(source)) {
            return;
        }
        if (!profileService.getUserProfile(userId).ssafy()) {
            throw new ForbiddenResourceException("Mattermost recommendations are only available to SSAFY users.");
        }
    }

    private boolean isMattermostSource(String source) {
        return "mattermost".equalsIgnoreCase(source) || "MATTERMOST".equalsIgnoreCase(source);
    }
}
