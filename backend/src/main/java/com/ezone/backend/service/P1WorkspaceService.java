package com.ezone.backend.service;

import com.ezone.backend.domain.ApplicationStatus;
import com.ezone.backend.domain.ReferenceType;
import com.ezone.backend.dto.basket.BasketJobResponse;
import com.ezone.backend.dto.basket.CreateBasketJobRequest;
import com.ezone.backend.dto.dashboard.DashboardJobResponse;
import com.ezone.backend.dto.dashboard.DashboardSummaryResponse;
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
import java.util.List;

public interface P1WorkspaceService {

    DashboardSummaryResponse getDashboardSummary(Long userId);

    List<BasketJobResponse> listBasketJobs(Long userId, ApplicationStatus status, String sort);

    BasketJobResponse createBasketJob(Long userId, CreateBasketJobRequest request);

    BasketJobResponse getBasketJob(Long userId, Long basketJobId);

    BasketJobResponse updateBasketJobStatus(Long userId, Long basketJobId, ApplicationStatus status);

    void archiveBasketJob(Long userId, Long basketJobId);

    WorkspaceResponse getWorkspace(Long userId, Long workspaceId);

    WorkspaceDefaultsResponse getWorkspaceDefaults(Long userId, Long workspaceId);

    EssayQuestionResponse createQuestion(Long userId, Long workspaceId, CreateEssayQuestionRequest request);

    EssayQuestionResponse updateDraft(Long userId, Long workspaceId, Long draftId, UpdateDraftRequest request);

    EssayVersionResponse createVersion(Long userId, Long workspaceId, CreateEssayVersionRequest request);

    List<EssayVersionResponse> listVersions(Long userId, Long workspaceId);

    CompareEssayVersionsResponse compareVersions(
        Long userId,
        Long workspaceId,
        CompareEssayVersionsRequest request
    );

    List<ReferenceResponse> listReferences(Long userId, Long workspaceId);

    ReferenceResponse createReference(Long userId, Long workspaceId, CreateReferenceRequest request);

    ReferenceResponse getReference(Long userId, Long referenceId);

    ReferenceResponse updateReference(Long userId, Long referenceId, CreateReferenceRequest request);

    void deleteReference(Long userId, Long referenceId);

    List<DashboardJobResponse> listRecommendationJobs(Long userId);

    BasketJobResponse saveRecommendation(Long userId, Long recommendationId);
}
