package com.ezone.backend.controller;

import com.ezone.backend.domain.ApplicationStatus;
import com.ezone.backend.dto.ApiResponse;
import com.ezone.backend.dto.basket.BasketJobResponse;
import com.ezone.backend.dto.basket.CreateBasketJobRequest;
import com.ezone.backend.dto.basket.UpdateBasketJobRequest;
import com.ezone.backend.dto.basket.UpdateBasketJobStatusRequest;
import com.ezone.backend.service.NotionIntegrationService;
import com.ezone.backend.service.P1WorkspaceService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/basket/jobs")
public class BasketJobController {

    private final P1WorkspaceService workspaceService;
    private final NotionIntegrationService notionIntegrationService;

    public BasketJobController(P1WorkspaceService workspaceService, NotionIntegrationService notionIntegrationService) {
        this.workspaceService = workspaceService;
        this.notionIntegrationService = notionIntegrationService;
    }

    @GetMapping
    public ApiResponse<List<BasketJobResponse>> listJobs(
        @RequestParam(required = false) ApplicationStatus status,
        @RequestParam(required = false) String sort
    ) {
        return ApiResponse.success(
            workspaceService.listBasketJobs(CurrentUserSupport.currentUserId(), status, sort)
        );
    }

    @PostMapping
    public ApiResponse<BasketJobResponse> createJob(@Valid @RequestBody CreateBasketJobRequest request) {
        BasketJobResponse basketJob = workspaceService.createBasketJob(CurrentUserSupport.currentUserId(), request);
        notionIntegrationService.recordJobOnlySync(basketJob);
        return ApiResponse.success(basketJob);
    }

    @GetMapping("/{basketJobId}")
    public ApiResponse<BasketJobResponse> getJob(@PathVariable Long basketJobId) {
        return ApiResponse.success(workspaceService.getBasketJob(CurrentUserSupport.currentUserId(), basketJobId));
    }

    @PatchMapping("/{basketJobId}")
    public ApiResponse<BasketJobResponse> updateJob(
        @PathVariable Long basketJobId,
        @Valid @RequestBody UpdateBasketJobRequest request
    ) {
        return ApiResponse.success(workspaceService.updateBasketJob(
            CurrentUserSupport.currentUserId(),
            basketJobId,
            request
        ));
    }

    @PatchMapping("/{basketJobId}/status")
    public ApiResponse<BasketJobResponse> updateStatus(
        @PathVariable Long basketJobId,
        @Valid @RequestBody UpdateBasketJobStatusRequest request
    ) {
        return ApiResponse.success(workspaceService.updateBasketJobStatus(
            CurrentUserSupport.currentUserId(),
            basketJobId,
            request.applicationStatus()
        ));
    }

    @DeleteMapping("/{basketJobId}")
    public ApiResponse<Void> archiveJob(@PathVariable Long basketJobId) {
        workspaceService.archiveBasketJob(CurrentUserSupport.currentUserId(), basketJobId);
        return ApiResponse.success(null);
    }
}
