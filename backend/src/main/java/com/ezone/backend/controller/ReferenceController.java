package com.ezone.backend.controller;

import com.ezone.backend.dto.ApiResponse;
import com.ezone.backend.dto.workspace.CreateReferenceRequest;
import com.ezone.backend.dto.workspace.ReferenceResponse;
import com.ezone.backend.service.P1WorkspaceService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/references")
public class ReferenceController {

    private final P1WorkspaceService workspaceService;

    public ReferenceController(P1WorkspaceService workspaceService) {
        this.workspaceService = workspaceService;
    }

    @GetMapping("/{referenceId}")
    public ApiResponse<ReferenceResponse> getReference(@PathVariable Long referenceId) {
        return ApiResponse.success(workspaceService.getReference(CurrentUserSupport.currentUserId(), referenceId));
    }

    @GetMapping("/{referenceId}/side-panel")
    public ApiResponse<ReferenceResponse> getSidePanelReference(@PathVariable Long referenceId) {
        return ApiResponse.success(workspaceService.getReference(CurrentUserSupport.currentUserId(), referenceId));
    }

    @PatchMapping("/{referenceId}")
    public ApiResponse<ReferenceResponse> updateReference(
        @PathVariable Long referenceId,
        @Valid @RequestBody CreateReferenceRequest request
    ) {
        return ApiResponse.success(workspaceService.updateReference(
            CurrentUserSupport.currentUserId(),
            referenceId,
            request
        ));
    }

    @DeleteMapping("/{referenceId}")
    public ApiResponse<Void> deleteReference(@PathVariable Long referenceId) {
        workspaceService.deleteReference(CurrentUserSupport.currentUserId(), referenceId);
        return ApiResponse.success(null);
    }
}
