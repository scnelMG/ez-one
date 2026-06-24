package com.ezone.backend.service;

import com.ezone.backend.domain.ReferenceType;
import com.ezone.backend.dto.dart.CreateDartAnalysisRequest;
import com.ezone.backend.dto.dart.DartAnalysisContentResponse;
import com.ezone.backend.dto.dart.DartAnalysisResponse;
import com.ezone.backend.dto.dart.DartDisclosureListResponse;
import com.ezone.backend.dto.workspace.CreateReferenceRequest;
import com.ezone.backend.dto.workspace.ReferenceResponse;
import com.ezone.backend.dto.workspace.WorkspaceResponse;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class DefaultDartAnalysisService implements DartAnalysisService {

    private final P1WorkspaceService workspaceService;
    private final OpenDartClient openDartClient;
    private final DartAiAnalysisClient aiClient;
    private final GmsKeyInfoClient gmsKeyInfoClient;
    private final DartAnalysisQualityEvaluator qualityEvaluator;
    private final AtomicLong analysisSequence = new AtomicLong(1000L);
    private final ConcurrentMap<Long, StoredDartAnalysis> analyses = new ConcurrentHashMap<>();

    public DefaultDartAnalysisService(
        P1WorkspaceService workspaceService,
        OpenDartClient openDartClient,
        DartAiAnalysisClient aiClient,
        GmsKeyInfoClient gmsKeyInfoClient,
        DartAnalysisQualityEvaluator qualityEvaluator
    ) {
        this.workspaceService = workspaceService;
        this.openDartClient = openDartClient;
        this.aiClient = aiClient;
        this.gmsKeyInfoClient = gmsKeyInfoClient;
        this.qualityEvaluator = qualityEvaluator;
    }

    @Override
    public DartDisclosureListResponse listDisclosures(Long userId, Long workspaceId) {
        WorkspaceResponse workspace = workspaceService.getWorkspace(userId, workspaceId);
        try {
            return DartDisclosureListResponse.available(openDartClient.listPeriodicDisclosures(workspace.companyName()));
        } catch (RuntimeException exception) {
            return DartDisclosureListResponse.unavailable("DART disclosures are temporarily unavailable.");
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

        Long analysisId = analysisSequence.incrementAndGet();
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
                analysisId,
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
                analysisId,
                workspaceId,
                request.rceptNo(),
                request.reportName(),
                companyName,
                "FAILED",
                null,
                sourceUrl,
                DartAnalysisContentResponse.empty(),
                "AI analysis failed. You can still write a manual DART memo."
            );
        }
        analyses.put(analysisId, new StoredDartAnalysis(userId, workspaceId, response));
        return response;
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
            "DART AI analysis - " + analysis.reportName(),
            formatReferenceBody(analysis),
            analysis.sourceUrl()
        ));
    }

    private StoredDartAnalysis requireAnalysis(Long userId, Long workspaceId, Long analysisId) {
        StoredDartAnalysis stored = analyses.get(analysisId);
        if (stored == null) {
            throw new IllegalArgumentException("DART analysis not found.");
        }
        if (!Objects.equals(stored.userId(), userId) || !Objects.equals(stored.workspaceId(), workspaceId)) {
            throw new ForbiddenResourceException("DART analysis is not owned by current user.");
        }
        return stored;
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
        builder.append("# DART AI analysis\n\n");
        builder.append("- Company: ").append(defaultText(analysis.companyName())).append('\n');
        builder.append("- Report: ").append(defaultText(analysis.reportName())).append('\n');
        builder.append("- Receipt no: ").append(defaultText(analysis.rceptNo())).append("\n\n");
        appendSectionAnalysis(builder, analysis.result().mainProductsAndServices());
        appendSectionAnalysis(builder, analysis.result().contractsAndRAndD());
        appendSectionAnalysis(builder, analysis.result().otherNotes());
        appendEvidenceCards(builder, analysis.result().evidenceCards());
        appendList(builder, "Appeal points", analysis.result().appealPoints());
        appendList(builder, "Suggested sentences", analysis.result().suggestedSentences());
        appendList(builder, "Cautions", analysis.result().cautions());
        appendList(builder, "Missing info", analysis.result().missingInfo());
        return builder.toString().trim();
    }

    private void appendSectionAnalysis(StringBuilder builder, DartAnalysisContentResponse.DartSectionAnalysis section) {
        if (section == null || !StringUtils.hasText(section.coreSummary())) {
            return;
        }
        builder.append("## ").append(defaultText(section.sectionTitle())).append('\n');
        builder.append(section.coreSummary()).append("\n\n");
        appendList(builder, "DART evidence", section.evidencePoints());
        appendList(builder, "Job fit", section.jobFitPoints());
        if (section.resumeUsePoints() != null && !section.resumeUsePoints().isEmpty()) {
            builder.append("### Essay use points\n");
            for (DartAnalysisContentResponse.ResumeUsePoint point : section.resumeUsePoints()) {
                builder.append("- ").append(defaultText(point.useCase()))
                    .append(": ").append(defaultText(point.recommendation())).append('\n');
            }
            builder.append('\n');
        }
        appendList(builder, "Sentence candidates", section.sentenceCandidates());
        appendList(builder, "Cautions", section.cautionPoints());
    }

    private void appendEvidenceCards(StringBuilder builder, List<DartAnalysisContentResponse.EvidenceCard> cards) {
        if (cards == null || cards.isEmpty()) {
            return;
        }
        builder.append("## Evidence cards\n");
        for (DartAnalysisContentResponse.EvidenceCard card : cards) {
            builder.append("- ").append(defaultText(card.title()))
                .append(" (").append(defaultText(card.sourceSection()))
                .append(", ").append(defaultText(card.rceptNo())).append("): ")
                .append(defaultText(card.summary())).append('\n');
        }
        builder.append('\n');
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
