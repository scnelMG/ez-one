package com.ezone.backend.service;

import com.ezone.backend.dto.dart.CreateDartAnalysisRequest;
import com.ezone.backend.dto.dart.DartAnalysisResponse;
import com.ezone.backend.dto.dart.DartDisclosureListResponse;
import com.ezone.backend.dto.workspace.ReferenceResponse;

public interface DartAnalysisService {

    DartDisclosureListResponse listDisclosures(Long userId, Long workspaceId);

    DartAnalysisResponse createAnalysis(Long userId, Long workspaceId, CreateDartAnalysisRequest request);

    DartAnalysisResponse getAnalysis(Long userId, Long workspaceId, Long analysisId);

    ReferenceResponse saveAnalysisAsReference(Long userId, Long workspaceId, Long analysisId);
}
