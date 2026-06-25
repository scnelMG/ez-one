package com.ezone.backend.service;

import com.ezone.backend.domain.ReferenceType;
import com.ezone.backend.domain.persistence.DartAnalysisRow;
import com.ezone.backend.dto.dart.CreateDartAnalysisRequest;
import com.ezone.backend.dto.dart.DartAnalysisContentResponse;
import com.ezone.backend.dto.dart.DartAnalysisResponse;
import com.ezone.backend.dto.dart.DartDisclosureListResponse;
import com.ezone.backend.dto.workspace.CreateReferenceRequest;
import com.ezone.backend.dto.workspace.ReferenceResponse;
import com.ezone.backend.dto.workspace.WorkspaceResponse;
import com.ezone.backend.mapper.DartAnalysisMapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Objects;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class DefaultDartAnalysisService implements DartAnalysisService {

    private final P1WorkspaceService workspaceService;
    private final OpenDartClient openDartClient;
    private final DartAiAnalysisClient aiClient;
    private final GmsKeyInfoClient gmsKeyInfoClient;
    private final DartAnalysisQualityEvaluator qualityEvaluator;
    private final DartAnalysisMapper dartAnalysisMapper;
    private final ObjectMapper objectMapper;

    public DefaultDartAnalysisService(
        P1WorkspaceService workspaceService,
        OpenDartClient openDartClient,
        DartAiAnalysisClient aiClient,
        GmsKeyInfoClient gmsKeyInfoClient,
        DartAnalysisQualityEvaluator qualityEvaluator,
        DartAnalysisMapper dartAnalysisMapper,
        ObjectMapper objectMapper
    ) {
        this.workspaceService = workspaceService;
        this.openDartClient = openDartClient;
        this.aiClient = aiClient;
        this.gmsKeyInfoClient = gmsKeyInfoClient;
        this.qualityEvaluator = qualityEvaluator;
        this.dartAnalysisMapper = dartAnalysisMapper;
        this.objectMapper = objectMapper;
    }

    @Override
    public DartDisclosureListResponse listDisclosures(Long userId, Long workspaceId) {
        WorkspaceResponse workspace = workspaceService.getWorkspace(userId, workspaceId);
        try {
            return DartDisclosureListResponse.available(openDartClient.listPeriodicDisclosures(workspace.companyName()));
        } catch (RuntimeException exception) {
            return DartDisclosureListResponse.unavailable(
                StringUtils.hasText(exception.getMessage())
                    ? exception.getMessage()
                    : "DART disclosures are temporarily unavailable."
            );
        }
    }

    @Override
    public DartAnalysisResponse createAnalysis(Long userId, Long workspaceId, CreateDartAnalysisRequest request) {
        WorkspaceResponse workspace = workspaceService.getWorkspace(userId, workspaceId);
        GmsKeyStatus keyStatus = gmsKeyInfoClient.getKeyStatus();
        if (!keyStatus.available()) {
            throw new DartAnalysisUnavailableException(
                StringUtils.hasText(keyStatus.message()) ? keyStatus.message() : "GMS is not available."
            );
        }

        String companyName = firstText(request.companyName(), workspace.companyName());
        String positionTitle = firstText(request.positionTitle(), workspace.positionTitle());
        String documentText = firstText(request.documentText(), downloadDocumentText(request.rceptNo()));
        String sourceUrl = sourceUrl(request.rceptNo());

        DartAnalysisResponse response;
        try {
            DartAiAnalysisResult result = aiClient.analyze(new DartAiAnalysisRequest(
                request.rceptNo(),
                request.reportName(),
                companyName,
                positionTitle,
                nullToEmpty(request.essayQuestions()),
                documentText
            ));
            DartAnalysisEvaluation evaluation = qualityEvaluator.evaluate(result.content(), request.rceptNo());
            if (!evaluation.passed()) {
                throw new IllegalStateException("AI analysis did not pass the DART quality gate.");
            }
            response = new DartAnalysisResponse(
                null,
                workspaceId,
                request.rceptNo(),
                request.reportName(),
                companyName,
                "COMPLETED",
                result.model(),
                sourceUrl,
                evaluation.content(),
                null
            );
        } catch (RuntimeException exception) {
            response = new DartAnalysisResponse(
                null,
                workspaceId,
                request.rceptNo(),
                request.reportName(),
                companyName,
                "FAILED",
                null,
                sourceUrl,
                DartAnalysisContentResponse.empty(),
                "DART 공시 분석을 완료하지 못했습니다. 잠시 후 다시 시도해주세요."
            );
        }
        return persistAnalysis(userId, response);
    }

    @Override
    public DartAnalysisResponse getAnalysis(Long userId, Long workspaceId, Long analysisId) {
        return requireAnalysis(userId, workspaceId, analysisId).response();
    }

    @Override
    public ReferenceResponse saveAnalysisAsReference(Long userId, Long workspaceId, Long analysisId) {
        StoredDartAnalysis stored = requireAnalysis(userId, workspaceId, analysisId);
        DartAnalysisResponse analysis = stored.response();
        if (!"COMPLETED".equals(analysis.status())) {
            throw new DartAnalysisInvalidStateException("Only completed DART analysis can be saved.");
        }
        return workspaceService.createReference(userId, workspaceId, new CreateReferenceRequest(
            "DART",
            ReferenceType.DART,
            "DART AI 분석 - " + analysis.reportName(),
            formatReferenceBody(analysis),
            analysis.sourceUrl()
        ));
    }

    private StoredDartAnalysis requireAnalysis(Long userId, Long workspaceId, Long analysisId) {
        DartAnalysisRow row = dartAnalysisMapper.findById(analysisId);
        if (row == null) {
            throw new IllegalArgumentException("DART analysis not found.");
        }
        if (!Objects.equals(row.getUserId(), userId) || !Objects.equals(row.getWorkspaceId(), workspaceId)) {
            throw new ForbiddenResourceException("DART analysis is not owned by current user.");
        }
        return new StoredDartAnalysis(row.getUserId(), row.getWorkspaceId(), toResponse(row));
    }

    private DartAnalysisResponse persistAnalysis(Long userId, DartAnalysisResponse response) {
        DartAnalysisRow row = new DartAnalysisRow();
        row.setUserId(userId);
        row.setWorkspaceId(response.workspaceId());
        row.setRceptNo(response.rceptNo());
        row.setReportName(response.reportName());
        row.setCompanyName(response.companyName());
        row.setStatus(response.status());
        row.setModel(response.model());
        row.setSourceUrl(response.sourceUrl());
        row.setResultJson(writeResultJson(response.result()));
        row.setErrorMessage(response.errorMessage());
        dartAnalysisMapper.insert(row);
        return new DartAnalysisResponse(
            row.getId(),
            response.workspaceId(),
            response.rceptNo(),
            response.reportName(),
            response.companyName(),
            response.status(),
            response.model(),
            response.sourceUrl(),
            response.result(),
            response.errorMessage()
        );
    }

    private DartAnalysisResponse toResponse(DartAnalysisRow row) {
        return new DartAnalysisResponse(
            row.getId(),
            row.getWorkspaceId(),
            row.getRceptNo(),
            row.getReportName(),
            row.getCompanyName(),
            row.getStatus(),
            row.getModel(),
            row.getSourceUrl(),
            readResultJson(row.getResultJson()),
            row.getErrorMessage()
        );
    }

    private String writeResultJson(DartAnalysisContentResponse result) {
        try {
            return objectMapper.writeValueAsString(result);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to serialize DART analysis result.", exception);
        }
    }

    private DartAnalysisContentResponse readResultJson(String resultJson) {
        try {
            return objectMapper.readValue(resultJson, DartAnalysisContentResponse.class);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to read DART analysis result.", exception);
        }
    }

    private String downloadDocumentText(String rceptNo) {
        if (!StringUtils.hasText(rceptNo)) {
            return "";
        }
        try {
            return openDartClient.downloadDocumentText(rceptNo);
        } catch (RuntimeException exception) {
            return "";
        }
    }

    private String formatReferenceBody(DartAnalysisResponse analysis) {
        StringBuilder builder = new StringBuilder();
        builder.append("# DART analysis advice\n\n");
        builder.append("- Company: ").append(defaultText(analysis.companyName())).append('\n');
        builder.append("- Report: ").append(defaultText(analysis.reportName())).append("\n\n");
        appendAdviceSection(builder, analysis.result().mainProductsAndServices());
        appendAdviceSection(builder, analysis.result().contractsAndRAndD());
        appendAdviceSection(builder, analysis.result().otherNotes());
        appendList(builder, "지원서에 사용할 포인트", analysis.result().appealPoints());
        appendList(builder, "문장 후보", analysis.result().suggestedSentences());
        appendList(builder, "주의할 표현", analysis.result().cautions());
        appendList(builder, "추가 확인 필요", analysis.result().missingInfo());
        return builder.toString().trim();
    }

    private void appendAdviceSection(StringBuilder builder, DartAnalysisContentResponse.DartSectionAnalysis section) {
        if (section == null || !StringUtils.hasText(section.coreSummary())) {
            return;
        }
        builder.append("## ").append(defaultText(section.sectionTitle())).append('\n');
        builder.append(section.coreSummary()).append("\n\n");
        if (section.resumeUsePoints() != null && !section.resumeUsePoints().isEmpty()) {
            builder.append("### Advice\n");
            for (DartAnalysisContentResponse.ResumeUsePoint point : section.resumeUsePoints()) {
                builder.append("- ").append(defaultText(point.useCase()))
                    .append(": ").append(defaultText(point.recommendation())).append('\n');
            }
            builder.append('\n');
        }
        appendList(builder, "Sentence candidates", section.sentenceCandidates());
        appendList(builder, "Cautions", section.cautionPoints());
    }

    private void appendList(StringBuilder builder, String title, List<String> items) {
        if (items == null || items.isEmpty()) {
            return;
        }
        builder.append("## ").append(title).append('\n');
        for (String item : items) {
            builder.append("- ").append(item).append('\n');
        }
        builder.append('\n');
    }

    private static List<String> nullToEmpty(List<String> values) {
        return values == null ? List.of() : values;
    }

    private static String firstText(String first, String fallback) {
        return StringUtils.hasText(first) ? first : defaultText(fallback);
    }

    private static String defaultText(String value) {
        return StringUtils.hasText(value) ? value : "";
    }

    private static String sourceUrl(String rceptNo) {
        return "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=" + defaultText(rceptNo);
    }

    private record StoredDartAnalysis(
        Long userId,
        Long workspaceId,
        DartAnalysisResponse response
    ) {
    }
}
