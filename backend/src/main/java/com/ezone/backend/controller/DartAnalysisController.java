package com.ezone.backend.controller;

import com.ezone.backend.dto.ApiResponse;
import com.ezone.backend.dto.dart.CreateDartAnalysisRequest;
import com.ezone.backend.dto.dart.DartAnalysisResponse;
import com.ezone.backend.dto.dart.DartDisclosureListResponse;
import com.ezone.backend.dto.workspace.ReferenceResponse;
import com.ezone.backend.service.DartAnalysisService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/workspaces/{workspaceId}/dart")
public class DartAnalysisController {

    private final DartAnalysisService dartAnalysisService;

    public DartAnalysisController(DartAnalysisService dartAnalysisService) {
        this.dartAnalysisService = dartAnalysisService;
    }

    @GetMapping("/disclosures")
    public ApiResponse<DartDisclosureListResponse> listDisclosures(@PathVariable Long workspaceId) {
        return ApiResponse.success(dartAnalysisService.listDisclosures(CurrentUserSupport.currentUserId(), workspaceId));
    }

    @PostMapping("/analyses")
    public ApiResponse<DartAnalysisResponse> createAnalysis(
        @PathVariable Long workspaceId,
        @Valid @RequestBody CreateDartAnalysisRequest request
    ) {
        return ApiResponse.success(dartAnalysisService.createAnalysis(
            CurrentUserSupport.currentUserId(),
            workspaceId,
            request
        ));
    }

    @GetMapping("/analyses/{analysisId}")
    public ApiResponse<DartAnalysisResponse> getAnalysis(
        @PathVariable Long workspaceId,
        @PathVariable Long analysisId
    ) {
        return ApiResponse.success(dartAnalysisService.getAnalysis(
            CurrentUserSupport.currentUserId(),
            workspaceId,
            analysisId
        ));
    }

    @PostMapping("/analyses/{analysisId}/save-reference")
    public ApiResponse<ReferenceResponse> saveAnalysisAsReference(
        @PathVariable Long workspaceId,
        @PathVariable Long analysisId
    ) {
        return ApiResponse.success(dartAnalysisService.saveAnalysisAsReference(
            CurrentUserSupport.currentUserId(),
            workspaceId,
            analysisId
        ));
    }
}
