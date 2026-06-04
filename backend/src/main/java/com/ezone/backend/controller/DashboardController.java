package com.ezone.backend.controller;

import com.ezone.backend.dto.ApiResponse;
import com.ezone.backend.dto.dashboard.DashboardSummaryResponse;
import com.ezone.backend.service.P1WorkspaceService;
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
}
