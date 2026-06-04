package com.ezone.backend.controller;

import com.ezone.backend.dto.ApiResponse;
import com.ezone.backend.dto.basket.BasketJobResponse;
import com.ezone.backend.dto.dashboard.DashboardJobResponse;
import com.ezone.backend.service.P1WorkspaceService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/recommendations/jobs")
public class RecommendationController {

    private final P1WorkspaceService workspaceService;

    public RecommendationController(P1WorkspaceService workspaceService) {
        this.workspaceService = workspaceService;
    }

    @GetMapping
    public ApiResponse<List<DashboardJobResponse>> listRecommendations() {
        return ApiResponse.success(workspaceService.listRecommendationJobs(CurrentUserSupport.currentUserId()));
    }

    @PostMapping("/{recommendationId}/save")
    public ApiResponse<BasketJobResponse> saveRecommendation(@PathVariable Long recommendationId) {
        return ApiResponse.success(workspaceService.saveRecommendation(
            CurrentUserSupport.currentUserId(),
            recommendationId
        ));
    }
}
