package com.ezone.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ezone.backend.domain.ReferenceType;
import com.ezone.backend.domain.persistence.DartAnalysisRow;
import com.ezone.backend.dto.dart.CreateDartAnalysisRequest;
import com.ezone.backend.dto.dart.DartAnalysisContentResponse;
import com.ezone.backend.dto.dart.DartAnalysisResponse;
import com.ezone.backend.dto.dart.DartDisclosureResponse;
import com.ezone.backend.dto.workspace.CreateReferenceRequest;
import com.ezone.backend.dto.workspace.ReferenceResponse;
import com.ezone.backend.dto.workspace.WorkspaceResponse;
import com.ezone.backend.mapper.DartAnalysisMapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

class DartAnalysisServiceTest {

    private final P1WorkspaceService workspaceService = Mockito.mock(P1WorkspaceService.class);
    private final OpenDartClient openDartClient = Mockito.mock(OpenDartClient.class);
    private final DartAiAnalysisClient aiClient = Mockito.mock(DartAiAnalysisClient.class);
    private final GmsKeyInfoClient gmsKeyInfoClient = Mockito.mock(GmsKeyInfoClient.class);
    private final DartAnalysisMapper dartAnalysisMapper = Mockito.mock(DartAnalysisMapper.class);
    private final DartAnalysisQualityEvaluator qualityEvaluator = new DartAnalysisQualityEvaluator();
    private DefaultDartAnalysisService service;
    private DartAnalysisRow insertedAnalysis;

    @BeforeEach
    void setUp() {
        service = new DefaultDartAnalysisService(
            workspaceService,
            openDartClient,
            aiClient,
            gmsKeyInfoClient,
            qualityEvaluator,
            dartAnalysisMapper,
            new ObjectMapper()
        );
        insertedAnalysis = null;
    }

    @Test
    void listDisclosuresReturnsPeriodicReportsWithoutBlockingWorkspaceAccess() {
        when(workspaceService.getWorkspace(1L, 102L)).thenReturn(workspace());
        when(openDartClient.listPeriodicDisclosures("Kakao")).thenReturn(List.of(
            new DartDisclosureResponse(
                "20260330000123",
                "사업보고서",
                "A001",
                "2026-03-30",
                "Kakao",
                true,
                "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260330000123"
            )
        ));

        List<DartDisclosureResponse> reports = service.listDisclosures(1L, 102L).disclosures();

        assertThat(reports)
            .extracting(DartDisclosureResponse::rceptNo, DartDisclosureResponse::recommended)
            .containsExactly(org.assertj.core.groups.Tuple.tuple("20260330000123", true));
    }

    @Test
    void listDisclosuresReportsProviderConfigurationFailureSeparatelyFromNoReports() {
        when(workspaceService.getWorkspace(1L, 102L)).thenReturn(workspace());
        when(openDartClient.listPeriodicDisclosures("Kakao"))
            .thenThrow(new IllegalStateException("OpenDART API key is not configured."));

        var response = service.listDisclosures(1L, 102L);

        assertThat(response.available()).isFalse();
        assertThat(response.disclosures()).isEmpty();
        assertThat(response.message()).contains("OpenDART API key");
    }

    @Test
    void createAnalysisRequiresAvailableGmsCredits() {
        when(workspaceService.getWorkspace(1L, 102L)).thenReturn(workspace());
        when(gmsKeyInfoClient.getKeyStatus()).thenReturn(
            new GmsKeyStatus(false, 0, "2026-06-19T00:00:00", "GMS credit is exhausted.")
        );

        assertThatThrownBy(() -> service.createAnalysis(1L, 102L, analysisRequest()))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("GMS");
    }

    @Test
    void createAnalysisStoresStructuredEvidenceCardsForUserReview() {
        when(workspaceService.getWorkspace(1L, 102L)).thenReturn(workspace());
        when(gmsKeyInfoClient.getKeyStatus()).thenReturn(
            new GmsKeyStatus(true, 100, "2026-12-31T23:59:59", null)
        );
        assignInsertedAnalysisId(1001L);
        when(aiClient.analyze(any())).thenReturn(new DartAiAnalysisResult(
            "gpt-4.1",
            new DartAnalysisContentResponse(
                List.of(new DartAnalysisContentResponse.EvidenceCard(
                    "AI investment",
                    "The report describes AI platform investment.",
                    "Business overview",
                    "20260330000123",
                    92
                )),
                List.of("Connect platform investment to backend scalability experience."),
                List.of("I can contribute to reliable AI platform operations."),
                List.of("Do not describe this as investment advice."),
                List.of()
            )
        ));

        DartAnalysisResponse response = service.createAnalysis(1L, 102L, analysisRequest());
        when(dartAnalysisMapper.findById(response.id())).thenReturn(insertedAnalysis);

        assertThat(response.status()).isEqualTo("COMPLETED");
        assertThat(response.result().evidenceCards()).hasSize(1);
        assertThat(response.result().evidenceCards().get(0).rceptNo()).isEqualTo("20260330000123");
        assertThat(service.getAnalysis(1L, 102L, response.id()).result().appealPoints())
            .containsExactly("Connect platform investment to backend scalability experience.");
    }

    @Test
    void getAnalysisReadsPersistedAnalysisAfterServiceRestart() {
        when(workspaceService.getWorkspace(1L, 102L)).thenReturn(workspace());
        when(gmsKeyInfoClient.getKeyStatus()).thenReturn(
            new GmsKeyStatus(true, 100, "2026-12-31T23:59:59", null)
        );
        assignInsertedAnalysisId(1002L);
        when(aiClient.analyze(any())).thenReturn(new DartAiAnalysisResult(
            "gpt-4.1",
            new DartAnalysisContentResponse(
                List.of(new DartAnalysisContentResponse.EvidenceCard(
                    "Platform",
                    "The report describes platform investment.",
                    "Business overview",
                    "20260330000123",
                    90
                )),
                List.of("Use platform reliability as the main appeal."),
                List.of("I can improve platform reliability."),
                List.of("Do not overstate ownership."),
                List.of()
            )
        ));

        DartAnalysisResponse created = service.createAnalysis(1L, 102L, analysisRequest());
        when(dartAnalysisMapper.findById(created.id())).thenReturn(insertedAnalysis);
        DefaultDartAnalysisService restarted = new DefaultDartAnalysisService(
            workspaceService,
            openDartClient,
            aiClient,
            gmsKeyInfoClient,
            qualityEvaluator,
            dartAnalysisMapper,
            new ObjectMapper()
        );

        DartAnalysisResponse restored = restarted.getAnalysis(1L, 102L, created.id());

        assertThat(restored.id()).isEqualTo(created.id());
        assertThat(restored.result().appealPoints()).containsExactly("Use platform reliability as the main appeal.");
    }

    @Test
    void createAnalysisEvaluatesAndImprovesAiOutputBeforeUserReview() {
        when(workspaceService.getWorkspace(1L, 102L)).thenReturn(workspace());
        when(gmsKeyInfoClient.getKeyStatus()).thenReturn(
            new GmsKeyStatus(true, 100, "2026-12-31T23:59:59", null)
        );
        assignInsertedAnalysisId(1003L);
        when(aiClient.analyze(any())).thenReturn(new DartAiAnalysisResult(
            "gpt-4.1",
            new DartAnalysisContentResponse(
                List.of(
                    new DartAnalysisContentResponse.EvidenceCard(
                        "Valid platform signal",
                        "The report describes platform investment.",
                        "Business overview",
                        "20260330000123",
                        105
                    ),
                    new DartAnalysisContentResponse.EvidenceCard(
                        "Wrong receipt",
                        "This card is not grounded in the selected report.",
                        "Business overview",
                        "20240101000999",
                        91
                    )
                ),
                List.of("Connect platform investment to backend reliability.", "The hiring probability is high."),
                List.of("I can contribute to reliable platform operations.", "This improves the stock price."),
                List.of(),
                List.of()
            )
        ));

        DartAnalysisResponse response = service.createAnalysis(1L, 102L, analysisRequest());

        assertThat(response.status()).isEqualTo("COMPLETED");
        assertThat(response.result().evidenceCards()).hasSize(1);
        assertThat(response.result().evidenceCards().get(0).relevanceScore()).isEqualTo(100);
        assertThat(response.result().appealPoints())
            .containsExactly("Connect platform investment to backend reliability.");
        assertThat(response.result().suggestedSentences())
            .containsExactly("I can contribute to reliable platform operations.");
        assertThat(response.result().cautions())
            .anyMatch((item) -> item.contains("quality gate"));
    }

    @Test
    void saveAnalysisAsReferencePersistsReviewedDartMaterialOnlyForOwner() {
        when(workspaceService.getWorkspace(1L, 102L)).thenReturn(workspace());
        when(gmsKeyInfoClient.getKeyStatus()).thenReturn(
            new GmsKeyStatus(true, 100, "2026-12-31T23:59:59", null)
        );
        assignInsertedAnalysisId(1004L);
        when(aiClient.analyze(any())).thenReturn(new DartAiAnalysisResult(
            "gpt-4.1",
            new DartAnalysisContentResponse(
                List.of(new DartAnalysisContentResponse.EvidenceCard(
                    "R&D signal",
                    "R&D spending is presented as a strategic focus.",
                    "R&D",
                    "20260330000123",
                    88
                )),
                List.of("Use R&D execution experience as the appeal angle."),
                List.of("I will connect R&D goals with measurable delivery."),
                List.of("Keep the source-limited wording."),
                List.of("Exact team ownership is not in the report.")
            )
        ));
        when(workspaceService.createReference(Mockito.eq(1L), Mockito.eq(102L), any(CreateReferenceRequest.class)))
            .thenReturn(new ReferenceResponse(
                501L,
                "DART",
                ReferenceType.DART,
                "DART AI 분석 - 사업보고서",
                "body",
                "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260330000123"
            ));

        DartAnalysisResponse analysis = service.createAnalysis(1L, 102L, analysisRequest());
        when(dartAnalysisMapper.findById(analysis.id())).thenReturn(insertedAnalysis);
        ReferenceResponse reference = service.saveAnalysisAsReference(1L, 102L, analysis.id());

        assertThat(reference.referenceType()).isEqualTo(ReferenceType.DART);
        ArgumentCaptor<CreateReferenceRequest> captor = ArgumentCaptor.forClass(CreateReferenceRequest.class);
        verify(workspaceService).createReference(Mockito.eq(1L), Mockito.eq(102L), captor.capture());
        assertThat(captor.getValue().boardName()).isEqualTo("DART");
        assertThat(captor.getValue().title()).startsWith("DART AI 분석 - ");
        assertThat(captor.getValue().body())
            .contains("DART analysis advice", "Use R&D execution experience as the appeal angle.", "Keep the source-limited wording.")
            .doesNotContain("R&D signal", "20260330000123", "Evidence");

        assertThatThrownBy(() -> service.saveAnalysisAsReference(2L, 102L, analysis.id()))
            .isInstanceOf(ForbiddenResourceException.class);
    }

    private static CreateDartAnalysisRequest analysisRequest() {
        return new CreateDartAnalysisRequest(
            "20260330000123",
            "사업보고서",
            "Kakao",
            "Backend Developer",
            List.of("Why this company?"),
            "Business overview and R&D text."
        );
    }

    private static WorkspaceResponse workspace() {
        return new WorkspaceResponse(
            102L,
            201L,
            "Kakao",
            "Backend Developer",
            "D-10",
            "준비중",
            "https://careers.kakao.com",
            null,
            List.of(),
            List.of()
        );
    }

    private void assignInsertedAnalysisId(Long id) {
        Mockito.doAnswer(invocation -> {
            invocation.getArgument(0, DartAnalysisRow.class).setId(id);
            insertedAnalysis = invocation.getArgument(0, DartAnalysisRow.class);
            return 1;
        }).when(dartAnalysisMapper).insert(any(DartAnalysisRow.class));
    }
}
