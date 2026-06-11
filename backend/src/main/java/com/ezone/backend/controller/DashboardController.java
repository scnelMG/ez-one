package com.ezone.backend.controller;

import com.ezone.backend.dto.ApiResponse;
import com.ezone.backend.dto.dashboard.ActivitySummaryResponse;
import com.ezone.backend.dto.dashboard.DashboardSummaryResponse;
import com.ezone.backend.service.P1WorkspaceService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final P1WorkspaceService workspaceService;

    public DashboardController(P1WorkspaceService workspaceService) {
        this.workspaceService = workspaceService;
    }

    @GetMapping("/summary")
    public ApiResponse<DashboardSummaryResponse> getSummary() {
        return ApiResponse.success(workspaceService.getDashboardSummary(CurrentUserSupport.currentUserId()));
    }

    @GetMapping("/activities")
    public ApiResponse<List<ActivitySummaryResponse>> getActivitySummary() {
        return ApiResponse.success(workspaceService.getActivitySummary(CurrentUserSupport.currentUserId()));
    }
}
