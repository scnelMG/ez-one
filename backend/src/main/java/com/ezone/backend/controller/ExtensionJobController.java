package com.ezone.backend.controller;

import com.ezone.backend.dto.ApiResponse;
import com.ezone.backend.dto.basket.BasketJobResponse;
import com.ezone.backend.dto.basket.CreateBasketJobRequest;
import com.ezone.backend.dto.extension.ExtensionJobPreviewRequest;
import com.ezone.backend.dto.extension.ExtensionJobPreviewResponse;
import com.ezone.backend.service.P1WorkspaceService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/extension/jobs")
public class ExtensionJobController {

    private final P1WorkspaceService workspaceService;

    public ExtensionJobController(P1WorkspaceService workspaceService) {
        this.workspaceService = workspaceService;
    }

    @PostMapping("/preview")
    public ApiResponse<ExtensionJobPreviewResponse> preview(@RequestBody ExtensionJobPreviewRequest request) {
        boolean saveable = hasText(request.companyName())
            && hasText(request.positionTitle())
            && hasText(request.sourceUrl());
        return ApiResponse.success(new ExtensionJobPreviewResponse(
            saveable,
            request.companyName(),
            request.positionTitle(),
            request.deadlineLabel(),
            request.sourceUrl(),
            saveable ? "저장 가능한 공고입니다." : "회사명, 직무, 원문 URL은 필수입니다."
        ));
    }

    @PostMapping("/save")
    public ApiResponse<BasketJobResponse> save(@RequestBody ExtensionJobPreviewRequest request) {
        return ApiResponse.success(workspaceService.createBasketJob(
            CurrentUserSupport.currentUserId(),
            new CreateBasketJobRequest(
                request.companyName(),
                request.positionTitle(),
                request.deadlineLabel(),
                request.sourceUrl(),
                "EXTENSION"
            )
        ));
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
