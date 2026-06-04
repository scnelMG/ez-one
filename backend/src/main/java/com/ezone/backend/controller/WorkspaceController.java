package com.ezone.backend.controller;

import com.ezone.backend.dto.ApiResponse;
import com.ezone.backend.dto.workspace.CompareEssayVersionsRequest;
import com.ezone.backend.dto.workspace.CompareEssayVersionsResponse;
import com.ezone.backend.dto.workspace.CreateEssayQuestionRequest;
import com.ezone.backend.dto.workspace.CreateEssayVersionRequest;
import com.ezone.backend.dto.workspace.CreateReferenceRequest;
import com.ezone.backend.dto.workspace.EssayQuestionResponse;
import com.ezone.backend.dto.workspace.EssayVersionResponse;
import com.ezone.backend.dto.workspace.ReferenceResponse;
import com.ezone.backend.dto.workspace.UpdateDraftRequest;
import com.ezone.backend.dto.workspace.WorkspaceDefaultsResponse;
import com.ezone.backend.dto.workspace.WorkspaceResponse;
import com.ezone.backend.service.P1WorkspaceService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/workspaces")
public class WorkspaceController {

    private final P1WorkspaceService workspaceService;

    public WorkspaceController(P1WorkspaceService workspaceService) {
        this.workspaceService = workspaceService;
    }

    @GetMapping("/{workspaceId}")
    public ApiResponse<WorkspaceResponse> getWorkspace(@PathVariable Long workspaceId) {
        return ApiResponse.success(workspaceService.getWorkspace(CurrentUserSupport.currentUserId(), workspaceId));
    }

    @GetMapping("/{workspaceId}/defaults")
    public ApiResponse<WorkspaceDefaultsResponse> getDefaults(@PathVariable Long workspaceId) {
        return ApiResponse.success(workspaceService.getWorkspaceDefaults(CurrentUserSupport.currentUserId(), workspaceId));
    }

    @PostMapping("/{workspaceId}/questions")
    public ApiResponse<EssayQuestionResponse> createQuestion(
        @PathVariable Long workspaceId,
        @Valid @RequestBody CreateEssayQuestionRequest request
    ) {
        return ApiResponse.success(workspaceService.createQuestion(
            CurrentUserSupport.currentUserId(),
            workspaceId,
            request
        ));
    }

    @PatchMapping("/{workspaceId}/drafts/{draftId}")
    public ApiResponse<EssayQuestionResponse> updateDraft(
        @PathVariable Long workspaceId,
        @PathVariable Long draftId,
        @Valid @RequestBody UpdateDraftRequest request
    ) {
        return ApiResponse.success(workspaceService.updateDraft(
            CurrentUserSupport.currentUserId(),
            workspaceId,
            draftId,
            request
        ));
    }

    @PostMapping("/{workspaceId}/versions")
    public ApiResponse<EssayVersionResponse> createVersion(
        @PathVariable Long workspaceId,
        @Valid @RequestBody CreateEssayVersionRequest request
    ) {
        return ApiResponse.success(workspaceService.createVersion(
            CurrentUserSupport.currentUserId(),
            workspaceId,
            request
        ));
    }

    @GetMapping("/{workspaceId}/versions")
    public ApiResponse<List<EssayVersionResponse>> listVersions(@PathVariable Long workspaceId) {
        return ApiResponse.success(workspaceService.listVersions(CurrentUserSupport.currentUserId(), workspaceId));
    }

    @PostMapping("/{workspaceId}/versions/compare")
    public ApiResponse<CompareEssayVersionsResponse> compareVersions(
        @PathVariable Long workspaceId,
        @Valid @RequestBody CompareEssayVersionsRequest request
    ) {
        return ApiResponse.success(workspaceService.compareVersions(
            CurrentUserSupport.currentUserId(),
            workspaceId,
            request
        ));
    }

    @GetMapping("/{workspaceId}/references")
    public ApiResponse<List<ReferenceResponse>> listReferences(@PathVariable Long workspaceId) {
        return ApiResponse.success(workspaceService.listReferences(CurrentUserSupport.currentUserId(), workspaceId));
    }

    @PostMapping("/{workspaceId}/references")
    public ApiResponse<ReferenceResponse> createReference(
        @PathVariable Long workspaceId,
        @Valid @RequestBody CreateReferenceRequest request
    ) {
        return ApiResponse.success(workspaceService.createReference(
            CurrentUserSupport.currentUserId(),
            workspaceId,
            request
        ));
    }
}
