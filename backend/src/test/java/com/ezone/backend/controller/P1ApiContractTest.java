package com.ezone.backend.controller;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.ezone.backend.config.SecurityConfig;
import com.ezone.backend.domain.persistence.DocumentProfileSectionRow;
import com.ezone.backend.domain.UserAccount;
import com.ezone.backend.domain.persistence.UserProfileRow;
import com.ezone.backend.dto.support.SupportRequestResponse;
import com.ezone.backend.mapper.DocumentProfileMapper;
import com.ezone.backend.mapper.SupportRequestMapper;
import com.ezone.backend.mapper.UserAccountMapper;
import com.ezone.backend.mapper.UserProfileMapper;
import com.ezone.backend.mapper.UserSessionMapper;
import com.ezone.backend.security.JwtAccessTokenVerifier;
import com.ezone.backend.security.JwtAuthenticationFilter;
import com.ezone.backend.service.InMemoryHistoryService;
import com.ezone.backend.service.InMemoryP1WorkspaceService;
import com.ezone.backend.service.InMemoryProfileService;
import com.ezone.backend.service.MattermostIngestionService;
import com.ezone.backend.service.MattermostRecommendationService;
import com.ezone.backend.service.NotionClient;
import com.ezone.backend.service.NotionJobPageRequest;
import com.ezone.backend.service.NotionJobSyncRecordRow;
import com.ezone.backend.service.NotionConnectionRow;
import com.ezone.backend.service.NotionDatabaseResult;
import com.ezone.backend.service.NotionIntegrationRepository;
import com.ezone.backend.service.NotionOAuthToken;
import com.ezone.backend.service.NotionOAuthUrlService;
import com.ezone.backend.service.NotionPageResult;
import com.ezone.backend.service.NotionIntegrationService;
import com.ezone.backend.service.NotionSyncSettingsRow;
import com.ezone.backend.service.NotionTokenCipher;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.Map;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest({
    DashboardController.class,
    BasketJobController.class,
    WorkspaceController.class,
    ReferenceController.class,
    RecommendationController.class,
    ProfileController.class,
    CurrentUserController.class,
    SupportRequestController.class,
    NotionIntegrationController.class,
    ExtensionJobController.class,
    HistoryController.class,
    MattermostIntegrationController.class,
    MattermostAdminController.class
})
@Import({
    SecurityConfig.class,
    JwtAuthenticationFilter.class,
    JwtAccessTokenVerifier.class,
    InMemoryHistoryService.class,
    InMemoryP1WorkspaceService.class,
    InMemoryProfileService.class,
    MattermostIngestionService.class,
    NotionIntegrationService.class
})
@WithMockUser(username = "1")
@DirtiesContext(classMode = DirtiesContext.ClassMode.BEFORE_EACH_TEST_METHOD)
@TestPropertySource(properties = {
    "mattermost.webhook.secret=test-mm-secret",
    "mattermost.webhook.secrets=test-mm-secret,channel-two-secret"
})
class P1ApiContractTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private UserAccountMapper userAccountMapper;

    @MockitoBean
    private UserSessionMapper userSessionMapper;

    @MockitoBean
    private SupportRequestMapper supportRequestMapper;

    @MockitoBean
    private DocumentProfileMapper documentProfileMapper;

    @MockitoBean
    private UserProfileMapper userProfileMapper;

    @MockitoBean
    private MattermostRecommendationService mattermostRecommendationService;

    @MockitoBean
    private NotionClient notionClient;

    @MockitoBean
    private NotionOAuthUrlService notionOAuthUrlService;

    @MockitoBean
    private NotionIntegrationRepository notionIntegrationRepository;

    @MockitoBean
    private NotionTokenCipher notionTokenCipher;

    private final Map<Long, NotionConnectionRow> notionConnections = new ConcurrentHashMap<>();
    private final Map<Long, NotionSyncSettingsRow> notionSettings = new ConcurrentHashMap<>();
    private final Map<Long, List<com.ezone.backend.service.StoredSyncLogRow>> notionSyncLogs = new ConcurrentHashMap<>();
    private final Map<Long, NotionJobSyncRecordRow> notionJobSyncRecords = new ConcurrentHashMap<>();

    @BeforeEach
    void setUp() {
        notionConnections.clear();
        notionSettings.clear();
        notionSyncLogs.clear();
        notionJobSyncRecords.clear();
        when(userAccountMapper.findById(1L)).thenReturn(Optional.of(new UserAccount(
            1L,
            "google-subject",
            "user@example.com",
            "Hong Gil Dong",
            "Gil Dong",
            true
        )));
        when(documentProfileMapper.listSections(1L)).thenReturn(List.of(new DocumentProfileSectionRow(
            1L,
            "basicInfo",
            "{\"nameKo\":\"Hong Gil Dong\",\"email\":\"user@example.com\"}",
            "2026-06-17T10:00:00"
        )));
        when(documentProfileMapper.findLastSavedAt(1L)).thenReturn(Optional.of("2026-06-17T10:00:00"));
        when(userProfileMapper.findByUserId(1L)).thenReturn(Optional.of(new UserProfileRow(
            1L,
            "[\"Backend\"]",
            "[\"Startup\"]",
            "[\"IT\"]",
            "[\"Seoul\"]",
            "[\"Java\"]",
            true,
            true
        )));
        when(mattermostRecommendationService.listRecommendations(1L, "open")).thenReturn(List.of());
        when(notionClient.exchangeAuthorizationCode(anyString(), any())).thenReturn(new NotionOAuthToken(
            "notion-access-token",
            "workspace-1",
            "bot-1",
            "notion@example.com"
        ));
        when(notionClient.createJobsDatabase(anyString())).thenReturn(new NotionDatabaseResult(
            "root-page-1",
            "database-1",
            "data-source-1"
        ));
        when(notionClient.createJobPage(anyString(), anyString(), any(NotionJobPageRequest.class))).thenReturn(new NotionPageResult(
            "notion-page-1",
            "https://notion.so/notion-page-1"
        ));
        when(notionTokenCipher.encrypt(anyString())).thenReturn("cipher:notion-access-token");
        when(notionTokenCipher.decrypt(anyString())).thenReturn("notion-access-token");
        when(notionIntegrationRepository.findConnection(any())).thenAnswer(invocation -> Optional.ofNullable(
            notionConnections.get(invocation.getArgument(0, Long.class))
        ));
        when(notionIntegrationRepository.findSettings(any())).thenAnswer(invocation -> Optional.ofNullable(
            notionSettings.get(invocation.getArgument(0, Long.class))
        ));
        when(notionIntegrationRepository.listSyncLogs(any())).thenAnswer(invocation -> List.copyOf(
            notionSyncLogs.getOrDefault(invocation.getArgument(0, Long.class), List.of())
        ));
        when(notionIntegrationRepository.findJobSyncRecord(any(), any())).thenAnswer(invocation -> {
            Long userId = invocation.getArgument(0, Long.class);
            Long basketJobId = invocation.getArgument(1, Long.class);
            NotionJobSyncRecordRow row = notionJobSyncRecords.get(basketJobId);
            return row == null || !row.userId().equals(userId) ? Optional.empty() : Optional.of(row);
        });
        doAnswer(invocation -> {
            NotionConnectionRow row = invocation.getArgument(0, NotionConnectionRow.class);
            notionConnections.put(row.userId(), row);
            return null;
        }).when(notionIntegrationRepository).upsertConnection(any(NotionConnectionRow.class));
        doAnswer(invocation -> {
            Long userId = invocation.getArgument(0, Long.class);
            notionConnections.remove(userId);
            return null;
        }).when(notionIntegrationRepository).deleteConnection(any());
        doAnswer(invocation -> {
            NotionSyncSettingsRow row = invocation.getArgument(0, NotionSyncSettingsRow.class);
            notionSettings.put(row.userId(), row);
            return null;
        }).when(notionIntegrationRepository).upsertSettings(any(NotionSyncSettingsRow.class));
        doAnswer(invocation -> {
            com.ezone.backend.service.StoredSyncLogRow row = invocation.getArgument(
                0,
                com.ezone.backend.service.StoredSyncLogRow.class
            );
            List<com.ezone.backend.service.StoredSyncLogRow> logs = notionSyncLogs.computeIfAbsent(
                row.userId(),
                ignored -> new ArrayList<>()
            );
            logs.add(0, new com.ezone.backend.service.StoredSyncLogRow(
                (long) logs.size() + 1,
                row.userId(),
                row.basketJobId(),
                row.syncScope(),
                row.target(),
                row.status(),
                row.message(),
                row.notionPageId()
            ));
            return null;
        }).when(notionIntegrationRepository).insertSyncLog(any(com.ezone.backend.service.StoredSyncLogRow.class));
        doAnswer(invocation -> {
            NotionJobSyncRecordRow row = invocation.getArgument(0, NotionJobSyncRecordRow.class);
            notionJobSyncRecords.put(row.basketJobId(), row);
            return null;
        }).when(notionIntegrationRepository).upsertJobSyncRecord(any(NotionJobSyncRecordRow.class));
        when(notionOAuthUrlService.buildAuthorizationUrl(anyString(), anyString())).thenReturn(
            "https://api.notion.com/v1/oauth/authorize?client_id=notion-client-id&response_type=code&owner=user&state=notion-state"
        );
    }

    @Test
    void dashboardBasketAndWorkspaceContractsAreConnected() throws Exception {
        mockMvc.perform(get("/api/dashboard/summary"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.totalApplications", greaterThanOrEqualTo(3)))
            .andExpect(jsonPath("$.data.todayJobs[0].workspaceId", notNullValue()));

        mockMvc.perform(get("/api/basket/jobs"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data[0].companyName").value("네이버"))
            .andExpect(jsonPath("$.data[0].workspaceId", notNullValue()));

        mockMvc.perform(get("/api/workspaces/102"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.companyName").value("네이버"))
            .andExpect(jsonPath("$.data.companyDetails.companyType", notNullValue()))
            .andExpect(jsonPath("$.data.companyDetails.size", notNullValue()))
            .andExpect(jsonPath("$.data.questions[0].prompt", notNullValue()))
            .andExpect(jsonPath("$.data.references[0].title").value("JD 핵심 역량"));
    }

    @Test
    void dashboardSummaryShowsFiveNearestDeadlineJobs() throws Exception {
        createDashboardJob("D10 Company", "D-10");
        createDashboardJob("D1 Company", "D-1");
        createDashboardJob("D7 Company", "D-7");
        createDashboardJob("D2 Company", "D-2");

        mockMvc.perform(get("/api/dashboard/summary"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.todayJobs", hasSize(5)))
            .andExpect(jsonPath("$.data.todayJobs[0].deadlineLabel").value("오늘 18:00"))
            .andExpect(jsonPath("$.data.todayJobs[1].deadlineLabel").value("D-1"));
    }

    @Test
    void basketDeadlineSortUsesNearestDeadlineOrder() throws Exception {
        createDashboardJob("Sort D10 Company", "D-10");
        createDashboardJob("Sort D1 Company", "D-1");
        createDashboardJob("Sort D7 Company", "D-7");

        mockMvc.perform(get("/api/basket/jobs?sort=deadline"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[0].deadlineLabel").value("오늘 18:00"))
            .andExpect(jsonPath("$.data[1].deadlineLabel").value("D-1"));
    }

    @Test
    void dashboardActivitySummaryHasMatchingDailyLogs() throws Exception {
        String activityDate = objectMapper.readTree(mockMvc.perform(get("/api/dashboard/activities"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].date", notNullValue()))
                .andExpect(jsonPath("$.data[0].score").value(2))
                .andReturn()
                .getResponse()
                .getContentAsString())
            .path("data")
            .path(0)
            .path("date")
            .asText();

        mockMvc.perform(get("/api/dashboard/activities/logs").param("date", activityDate))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data", hasSize(1)))
            .andExpect(jsonPath("$.data[0].time").value("14:20"))
            .andExpect(jsonPath("$.data[0].description").value("지원 상태를 진행 중으로 변경 +2방울"));
    }

    @Test
    void historyApplicationsExposeSummaryRowsAndWorkspaceLinksWithoutActiveBasketPollution() throws Exception {
        mockMvc.perform(get("/api/history/applications"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.summary.total", greaterThanOrEqualTo(1)))
            .andExpect(jsonPath("$.data.summary.completed", greaterThanOrEqualTo(1)))
            .andExpect(jsonPath("$.data.periods[0].value").value("ALL"))
            .andExpect(jsonPath("$.data.companyTypes[0].type", notNullValue()))
            .andExpect(jsonPath("$.data.industryStats", notNullValue()))
            .andExpect(jsonPath("$.data.dataQuality.total", greaterThanOrEqualTo(1)))
            .andExpect(jsonPath("$.data.rows[0].workspaceId", notNullValue()))
            .andExpect(jsonPath("$.data.rows[0].resultStage", notNullValue()))
            .andExpect(jsonPath("$.data.rows[0].resultLabel", notNullValue()))
            .andExpect(jsonPath("$.data.rows[0].companyDataSource", notNullValue()));

        mockMvc.perform(get("/api/history/applications?period=2025-H1&resultStage=DOCUMENT_FAILED"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.rows[0].resultStage").value("DOCUMENT_FAILED"));

        mockMvc.perform(get("/api/basket/jobs"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[0].companyName").value("네이버"));
    }

    @Test
    void historyApplicationsAreScopedToAuthenticatedUser() throws Exception {
        mockMvc.perform(get("/api/history/applications").with(user("2")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.summary.total").value(0))
            .andExpect(jsonPath("$.data.rows", hasSize(0)));
    }

    @Test
    void historyApplicationLabelsCanBePersisted() throws Exception {
        mockMvc.perform(patch("/api/history/applications/1/labels")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "applicationStatus": "IN_PROGRESS",
                      "resultStage": "INTERVIEW_FAILED"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.id").value(1))
            .andExpect(jsonPath("$.data.applicationStatus").value("IN_PROGRESS"))
            .andExpect(jsonPath("$.data.resultStage").value("INTERVIEW_FAILED"));

        mockMvc.perform(get("/api/history/applications?period=2025-H1&resultStage=INTERVIEW_FAILED"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.rows[0].id").value(1))
            .andExpect(jsonPath("$.data.rows[0].applicationStatus").value("IN_PROGRESS"))
            .andExpect(jsonPath("$.data.rows[0].resultStage").value("INTERVIEW_FAILED"));
    }

    @Test
    void deletingReadyBasketJobDoesNotCreatePastApplicationHistory() throws Exception {
        String createdBody = mockMvc.perform(post("/api/basket/jobs")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "companyName": "Mistaken Basket Company",
                      "positionTitle": "Backend Developer",
                      "deadlineLabel": "2099.06.30",
                      "sourceUrl": "https://example.com/jobs/mistaken-basket",
                      "savedSource": "DIRECT"
                    }
                    """))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
        JsonNode created = objectMapper.readTree(createdBody);
        long basketJobId = created.at("/data/id").asLong();
        long workspaceId = created.at("/data/workspaceId").asLong();

        mockMvc.perform(delete("/api/basket/jobs/%d".formatted(basketJobId)))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/basket/jobs"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[?(@.id == %d)]".formatted(basketJobId), hasSize(0)));

        mockMvc.perform(get("/api/history/applications"))
            .andExpect(status().isOk())
            .andExpect(jsonPath(
                "$.data.rows[?(@.workspaceId == %d && @.companyName == 'Mistaken Basket Company')]".formatted(workspaceId),
                hasSize(0)
            ));
    }

    @Test
    void completedBasketJobAppearsInHistoryWithoutDeletingFromBasket() throws Exception {
        String createdBody = mockMvc.perform(post("/api/basket/jobs")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "companyName": "Completed History Company",
                      "positionTitle": "Frontend Developer",
                      "deadlineLabel": "2026.06.30",
                      "sourceUrl": "https://example.com/jobs/completed-history",
                      "savedSource": "DIRECT"
                    }
                    """))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
        JsonNode created = objectMapper.readTree(createdBody);
        long basketJobId = created.at("/data/id").asLong();
        long workspaceId = created.at("/data/workspaceId").asLong();

        mockMvc.perform(patch("/api/basket/jobs/%d/status".formatted(basketJobId))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "applicationStatus": "COMPLETED"
                    }
                    """))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/basket/jobs"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[?(@.id == %d)]".formatted(basketJobId), hasSize(1)));

        mockMvc.perform(get("/api/history/applications"))
            .andExpect(status().isOk())
            .andExpect(jsonPath(
                "$.data.rows[?(@.workspaceId == %d && @.companyName == 'Completed History Company' && @.applicationStatus == 'COMPLETED')]".formatted(workspaceId),
                hasSize(1)
            ));
    }

    @Test
    void workspaceDefaultsExposeDocumentProfileSections() throws Exception {
        mockMvc.perform(get("/api/workspaces/102/defaults"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.sections.projects", notNullValue()))
            .andExpect(jsonPath("$.data.sections.awards", notNullValue()));
    }

    @Test
    @WithMockUser(username = "2")
    void otherUserOwnedWorkspaceReturnsForbiddenError() throws Exception {
        mockMvc.perform(get("/api/workspaces/102"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.error.code").value("FORBIDDEN"));
    }

    @Test
    void workspaceExposesCompanyDetailPlaceholdersDerivedFromSavedUrl() throws Exception {
        String createdBody = mockMvc.perform(post("/api/basket/jobs")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "companyName": "Example Labs",
                      "positionTitle": "Backend Developer",
                      "deadlineLabel": "D-5",
                      "sourceUrl": "https://careers.example.com/jobs/backend",
                      "logoUrl": "https://static.example.com/example-logo.png",
                      "savedSource": "DIRECT"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.companyLogoUrl").value("https://static.example.com/example-logo.png"))
            .andReturn()
            .getResponse()
            .getContentAsString();
        long workspaceId = objectMapper.readTree(createdBody).at("/data/workspaceId").asLong();

        mockMvc.perform(get("/api/workspaces/%d".formatted(workspaceId)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.companyName").value("Example Labs"))
            .andExpect(jsonPath("$.data.companyDetails.domain").value("careers.example.com"))
            .andExpect(jsonPath("$.data.companyDetails.logoUrl").value("https://static.example.com/example-logo.png"))
            .andExpect(jsonPath("$.data.companyDetails.companyType").value("미확인"))
            .andExpect(jsonPath("$.data.companyDetails.size").value("미확인"))
            .andExpect(jsonPath("$.data.companyDetails.financialStatus").value("unverified"));
    }

    @Test
    void workspaceDoesNotExposeJobBoardDomainAsKnownCompanyHomepage() throws Exception {
        String createdBody = mockMvc.perform(post("/api/basket/jobs")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "companyName": "카카오뱅크",
                      "positionTitle": "인턴 · 정보보호 데이터 엔지니어",
                      "deadlineLabel": "2026.07.03",
                      "sourceUrl": "https://jasoseol.com/recruit?rec=104614",
                      "savedSource": "DIRECT"
                    }
                    """))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
        long workspaceId = objectMapper.readTree(createdBody).at("/data/workspaceId").asLong();

        mockMvc.perform(get("/api/workspaces/%d".formatted(workspaceId)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.companyName").value("카카오뱅크"))
            .andExpect(jsonPath("$.data.companyDetails.domain").value("kakaobank.com"))
            .andExpect(jsonPath("$.data.companyDetails.homepage").value("kakaobank.com"))
            .andExpect(jsonPath("$.data.companyDetails.companyType").value("대기업"))
            .andExpect(jsonPath("$.data.companyDetails.size").value("대기업"));
    }

    @Test
    void savingBasketJobCreatesWorkspace() throws Exception {
        mockMvc.perform(post("/api/basket/jobs")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "companyName": "쿠팡",
                      "positionTitle": "Backend Developer",
                      "deadlineLabel": "D-3",
                      "sourceUrl": "https://www.jasoseol.com/",
                      "savedSource": "DIRECT"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.companyName").value("쿠팡"))
            .andExpect(jsonPath("$.data.workspaceId", notNullValue()));
    }

    @Test
    void basketJobRejectsInvalidSourceUrlAndDeadlineFormat() throws Exception {
        mockMvc.perform(post("/api/basket/jobs")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "companyName": "Invalid URL Company",
                      "positionTitle": "Backend Developer",
                      "deadlineLabel": "D-3",
                      "sourceUrl": "not-a-url",
                      "savedSource": "DIRECT"
                    }
                    """))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
            .andExpect(jsonPath("$.error.message").value("입력값을 확인해 주세요."));

        mockMvc.perform(patch("/api/basket/jobs/101")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "companyName": "Updated Company",
                      "positionTitle": "Product Engineer",
                      "deadlineLabel": "June someday",
                      "sourceUrl": "https://example.com/jobs/101",
                      "applicationMemo": "Phone screen scheduled."
                    }
                    """))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }

    @Test
    void duplicateBasketJobUsesCompanyNameSourceUrlAndPosition() throws Exception {
        String firstBody = mockMvc.perform(post("/api/basket/jobs")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "companyName": "Duplicate Company",
                      "positionTitle": "Backend Developer",
                      "deadlineLabel": "D-6",
                      "sourceUrl": "https://example.com/jobs/duplicate-url",
                      "savedSource": "DIRECT"
                    }
                    """))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
        long firstBasketJobId = objectMapper.readTree(firstBody).at("/data/id").asLong();
        long firstWorkspaceId = objectMapper.readTree(firstBody).at("/data/workspaceId").asLong();

        mockMvc.perform(post("/api/basket/jobs")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "companyName": "Duplicate Company",
                      "positionTitle": "Backend Developer",
                      "deadlineLabel": "D-3",
                      "sourceUrl": "https://example.com/jobs/duplicate-url",
                      "savedSource": "DIRECT"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.id").value(firstBasketJobId))
            .andExpect(jsonPath("$.data.workspaceId").value(firstWorkspaceId))
            .andExpect(jsonPath("$.data.companyName").value("Duplicate Company"))
            .andExpect(jsonPath("$.data.positionTitle").value("Backend Developer"))
            .andExpect(jsonPath("$.data.sourceUrl").value("https://example.com/jobs/duplicate-url"));
    }

    @Test
    void basketStatusLabelsFollowStandardFourStatusMeanings() throws Exception {
        String createdBody = mockMvc.perform(post("/api/basket/jobs")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "companyName": "Status Company",
                      "positionTitle": "Backend Developer",
                      "deadlineLabel": "2099.06.30",
                      "sourceUrl": "https://example.com/jobs/status",
                      "savedSource": "DIRECT"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.applicationStatus").value("READY"))
            .andExpect(jsonPath("$.data.statusLabel").value("지원 전"))
            .andReturn()
            .getResponse()
            .getContentAsString();
        long basketJobId = objectMapper.readTree(createdBody).at("/data/id").asLong();

        mockMvc.perform(patch("/api/basket/jobs/%d/status".formatted(basketJobId))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    { "applicationStatus": "NOT_APPLIED" }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.applicationStatus").value("NOT_APPLIED"))
            .andExpect(jsonPath("$.data.statusLabel").value("미지원"));
    }

    @Test
    void basketJobCanBeUpdated() throws Exception {
        mockMvc.perform(patch("/api/basket/jobs/101")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "companyName": "Updated Company",
                      "positionTitle": "Product Engineer",
                      "deadlineLabel": "2026.06.30",
                      "sourceUrl": "https://example.com/jobs/101",
                      "applicationMemo": "Phone screen scheduled. Ask about platform team."
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.companyName").value("Updated Company"))
            .andExpect(jsonPath("$.data.positionTitle").value("Product Engineer"))
            .andExpect(jsonPath("$.data.deadlineLabel").value("2026.06.30"))
            .andExpect(jsonPath("$.data.sourceUrl").value("https://example.com/jobs/101"))
            .andExpect(jsonPath("$.data.applicationMemo").value("Phone screen scheduled. Ask about platform team."));
    }

    @Test
    void editingWorkspaceDraftMarksBasketJobInProgress() throws Exception {
        mockMvc.perform(patch("/api/workspaces/106/drafts/107")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    { "body": "Draft started from the workspace." }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true));

        mockMvc.perform(get("/api/basket/jobs/105"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.applicationStatus").value("IN_PROGRESS"));
    }

    @Test
    void overdueIncompleteBasketJobIsDisplayedAsNotApplied() throws Exception {
        String createdBody = mockMvc.perform(post("/api/basket/jobs")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "companyName": "Overdue Company",
                      "positionTitle": "Backend Developer",
                      "deadlineLabel": "2026.06.01",
                      "sourceUrl": "https://example.com/jobs/overdue",
                      "savedSource": "DIRECT"
                    }
                    """))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
        JsonNode created = objectMapper.readTree(createdBody);
        long basketJobId = created.at("/data/id").asLong();

        mockMvc.perform(patch("/api/basket/jobs/%d/status".formatted(basketJobId))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    { "applicationStatus": "IN_PROGRESS" }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.applicationStatus").value("NOT_APPLIED"));
    }

    @Test
    void workspaceDraftReferenceProfileAndNotionContractsRespond() throws Exception {
        mockMvc.perform(patch("/api/workspaces/102/drafts/103")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    { "body": "업데이트한 자기소개서 초안입니다." }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.currentLength").value(18));

        mockMvc.perform(post("/api/workspaces/102/references")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "boardName": "NEWS",
                      "referenceType": "NEWS",
                      "title": "기업 뉴스 메모",
                      "body": "수동으로 입력한 참고자료입니다.",
                      "url": "https://example.com/news"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.referenceType").value("NEWS"));

        mockMvc.perform(get("/api/me/profile"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.completed").value(true));

        mockMvc.perform(get("/api/me"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.email").value("user@example.com"));

        mockMvc.perform(get("/api/document-profile"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.sections.basicInfo", notNullValue()));

        mockMvc.perform(get("/api/extension/document-profile"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.sections.basicInfo", notNullValue()));

        mockMvc.perform(put("/api/document-profile/sections/basicInfo")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "payload": {
                        "nameKo": "Hong Gil Dong",
                        "email": "user@example.com"
                      }
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.lastSavedAt", notNullValue()));
        verify(documentProfileMapper).upsertSection(
            eq(1L),
            eq("basicInfo"),
            eq("{\"nameKo\":\"Hong Gil Dong\",\"email\":\"user@example.com\"}")
        );

        mockMvc.perform(put("/api/document-profile/sections/military")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "payload": {
                        "military": [
                          {
                            "status": "미필",
                            "branch": "",
                            "rank": "",
                            "hasDisability": false,
                            "isVeteran": false
                          }
                        ]
                      }
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.lastSavedAt", notNullValue()));
        verify(documentProfileMapper).upsertSection(
            eq(1L),
            eq("military"),
            eq("{\"military\":[{\"status\":\"미필\",\"branch\":\"\",\"rank\":\"\",\"hasDisability\":false,\"isVeteran\":false}]}")
        );

        mockMvc.perform(get("/api/integrations/notion"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.syncScope").value("JOB_ONLY"));
    }

    @Test
    void onboardingProfileUpdatePersistsPreferencesThroughUserProfileMapper() throws Exception {
        when(userProfileMapper.findByUserId(1L)).thenReturn(Optional.of(new UserProfileRow(
            1L,
            "[\"SW 개발\",\"프론트엔드\",\"AI/데이터\",\"AI/ML\"]",
            "[\"대기업\",\"스타트업\"]",
            "[\"IT/플랫폼\",\"금융\"]",
            "[\"서울\",\"원격\"]",
            "[\"React\",\"SQL\"]",
            false,
            true
        )));

        mockMvc.perform(put("/api/me/profile")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "desiredRoles": ["SW 개발", "프론트엔드", "AI/데이터", "AI/ML"],
                      "companyTypes": ["대기업", "스타트업"],
                      "industries": ["IT/플랫폼", "금융"],
                      "regions": ["서울", "원격"],
                      "skills": ["React", "SQL"],
                      "ssafy": false
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.desiredRoles[0]").value("SW 개발"))
            .andExpect(jsonPath("$.data.desiredRoles[3]").value("AI/ML"))
            .andExpect(jsonPath("$.data.skills[1]").value("SQL"))
            .andExpect(jsonPath("$.data.completed").value(true));

        verify(userProfileMapper).upsert(
            eq(1L),
            eq("[\"SW 개발\",\"프론트엔드\",\"AI/데이터\",\"AI/ML\"]"),
            eq("[\"대기업\",\"스타트업\"]"),
            eq("[\"IT/플랫폼\",\"금융\"]"),
            eq("[\"서울\",\"원격\"]"),
            eq("[\"React\",\"SQL\"]"),
            eq(false)
        );
        verify(userAccountMapper).markProfileCompleted(1L);
    }

    @Test
    void savingBasketJobRecordsJobOnlyNotionSyncLogWhenEnabled() throws Exception {
        mockMvc.perform(get("/api/integrations/notion/oauth-url")
                .param("redirectUri", "http://localhost:5173/mypage/notion")
                .param("state", "notion-state"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.authorizationUrl").value(
                "https://api.notion.com/v1/oauth/authorize?client_id=notion-client-id&response_type=code&owner=user&state=notion-state"
            ));

        mockMvc.perform(post("/api/integrations/notion/connect")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    { "authorizationCode": "oauth-code" }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.syncScope").value("JOB_ONLY"))
            .andExpect(jsonPath("$.data.syncEnabled").value(true));

        mockMvc.perform(post("/api/basket/jobs")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "companyName": "Notion Sync Company",
                      "positionTitle": "Backend Developer",
                      "deadlineLabel": "D-4",
                      "sourceUrl": "https://example.com/jobs/notion-sync",
                      "savedSource": "DIRECT"
                    }
                    """))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/integrations/notion/sync-logs"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[0].target").value("JOB"))
            .andExpect(jsonPath("$.data[0].basketJobId").exists())
            .andExpect(jsonPath("$.data[0].status").value("SUCCESS"))
            .andExpect(jsonPath("$.data[0].message").value(
                "JOB_ONLY synced: Notion Sync Company / Backend Developer -> notion-page-1"
            ));
    }

    @Test
    void notionRejectsNonJobOnlyScope() throws Exception {
        mockMvc.perform(put("/api/integrations/notion/sync-settings")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "syncEnabled": true,
                      "syncScope": "JOB_WITH_ESSAY"
                    }
                    """))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }

    @Test
    void failedNotionConnectionLogsFailureAndDoesNotBlockCoreJobSave() throws Exception {
        mockMvc.perform(post("/api/integrations/notion/connect")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    { "authorizationCode": "expired-oauth-code" }
                    """))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));

        mockMvc.perform(post("/api/basket/jobs")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "companyName": "Notion Failure Isolation Company",
                      "positionTitle": "Backend Developer",
                      "deadlineLabel": "D-4",
                      "sourceUrl": "https://example.com/jobs/notion-failure-isolation",
                      "savedSource": "DIRECT"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.companyName").value("Notion Failure Isolation Company"));

        mockMvc.perform(get("/api/integrations/notion/sync-logs"))
            .andExpect(status().isOk())
            .andExpect(jsonPath(
                "$.data[?(@.target == 'NOTION_CONNECTION' && @.status == 'FAILURE')]",
                hasSize(greaterThanOrEqualTo(1))
            ));
    }

    @Test
    void notionConnectionAndSyncLogsAreScopedToCurrentUser() throws Exception {
        mockMvc.perform(post("/api/integrations/notion/connect")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    { "authorizationCode": "user-one-oauth-code" }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.connected").value(true));

        mockMvc.perform(post("/api/basket/jobs")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "companyName": "User One Notion Company",
                      "positionTitle": "Backend Developer",
                      "deadlineLabel": "D-4",
                      "sourceUrl": "https://example.com/jobs/user-one-notion",
                      "savedSource": "DIRECT"
                    }
                    """))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/integrations/notion").with(user("2")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.connected").value(false))
            .andExpect(jsonPath("$.data.syncEnabled").value(false))
            .andExpect(jsonPath("$.data.syncScope").value("JOB_ONLY"));

        mockMvc.perform(get("/api/integrations/notion/sync-logs").with(user("2")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.length()").value(0));
    }

    @Test
    void workspaceQuestionCanBeUpdatedAndDeleted() throws Exception {
        mockMvc.perform(patch("/api/workspaces/102/questions/103")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "prompt": "Updated prompt",
                      "maxLength": 700
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.prompt").value("Updated prompt"))
            .andExpect(jsonPath("$.data.maxLength").value(700));

        mockMvc.perform(delete("/api/workspaces/102/questions/103"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void currentUserNicknameCanBeUpdated() throws Exception {
        when(userAccountMapper.findById(1L)).thenReturn(Optional.of(new UserAccount(
            1L,
            "google-subject",
            "user@example.com",
            "Hong Gil Dong",
            "길동",
            true
        )));

        mockMvc.perform(patch("/api/me")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    { "nickname": "길동" }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.nickname").value("길동"))
            .andExpect(jsonPath("$.data.name").value("Hong Gil Dong"));

        verify(userAccountMapper).updateNickname(1L, "길동");
    }

    @Test
    void currentUserProfileImageCanBeUpdated() throws Exception {
        when(userAccountMapper.findById(1L)).thenReturn(Optional.of(new UserAccount(
            1L,
            "google-subject",
            "user@example.com",
            "Hong Gil Dong",
            "Gil Dong",
            "data:image/png;base64,profile",
            true
        )));

        mockMvc.perform(patch("/api/me")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "nickname": "Gil Dong",
                      "profileImageUrl": "data:image/png;base64,profile"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.profileImageUrl").value("data:image/png;base64,profile"));

        verify(userAccountMapper).updateProfileImageUrl(1L, "data:image/png;base64,profile");
    }

    @Test
    void currentUserCanWithdrawAndRevokeSessions() throws Exception {
        mockMvc.perform(delete("/api/me"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true));

        verify(userSessionMapper).revokeAllByUserId(1L);
        verify(userAccountMapper).withdrawUser(1L);
    }

    @Test
    void supportRequestCanBeCreatedAndListedForCurrentUser() throws Exception {
        when(supportRequestMapper.findByUserId(1L)).thenReturn(List.of(
            new SupportRequestResponse(
                10L,
                "INQUIRY",
                "ERROR",
                "동기화가 실패합니다",
                "Notion 연결 후 동기화가 실패합니다.",
                "RECEIVED",
                Instant.parse("2026-06-17T08:00:00Z")
            )
        ));

        mockMvc.perform(post("/api/support/requests")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "requestType": "INQUIRY",
                      "category": "ERROR",
                      "title": "동기화가 실패합니다",
                      "body": "Notion 연결 후 동기화가 실패합니다."
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.id").value(10))
            .andExpect(jsonPath("$.data.status").value("RECEIVED"));

        verify(supportRequestMapper).insert(eq(1L), any());

        mockMvc.perform(get("/api/support/requests"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[0].title").value("동기화가 실패합니다"));
    }

    @Test
    void retiredBusinessSupportRequestIsRejectedByP1Contract() throws Exception {
        mockMvc.perform(post("/api/support/requests")
                .contentType(MediaType.APPLICATION_JSON)
                .content(String.format("""
                    {
                      "requestType": "%s",
                      "category": "CONTENT",
                      "title": "%s",
                      "body": "제휴 제안입니다.",
                      "companyName": "Partner Co."
                    }
                    """, "PARTNER" + "SHIP", "제휴" + " 문의")))
            .andExpect(status().isBadRequest());

        verify(supportRequestMapper, never()).insert(eq(1L), any());
    }

    @Test
    void extensionPreviewAndSaveContractsRespond() throws Exception {
        mockMvc.perform(post("/api/extension/jobs/preview")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "companyName": "당근",
                      "positionTitle": "Server Engineer",
                      "deadlineLabel": "D-6",
                      "sourceUrl": "https://www.jasoseol.com/"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.saveable").value(true))
            .andExpect(jsonPath("$.data.message").value("저장 가능한 공고입니다."));

        mockMvc.perform(post("/api/extension/jobs/save")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "companyName": "당근",
                      "positionTitle": "Server Engineer",
                      "deadlineLabel": "D-6",
                      "sourceUrl": "https://www.jasoseol.com/",
                      "selectedRoles": ["Backend", "Platform"],
                      "essayQuestions": [
                        { "prompt": "지원동기를 작성해 주세요.", "maxLength": 1000 }
                      ]
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[0].workspaceId", notNullValue()))
            .andExpect(jsonPath("$.data[0].positionTitle").value("Backend"))
            .andExpect(jsonPath("$.data[1].workspaceId", notNullValue()))
            .andExpect(jsonPath("$.data[1].positionTitle").value("Platform"));
    }

    @Test
    void extensionSaveUsesRoleSpecificEssayQuestions() throws Exception {
        String savedBody = mockMvc.perform(post("/api/extension/jobs/save")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "companyName": "Taewoong Logistics",
                      "positionTitle": "2026 Hiring",
                      "deadlineLabel": "2026-06-21 23:59",
                      "sourceUrl": "https://www.jasoseol.com/recruit/taewoong",
                      "selectedRoles": ["Robot Automation", "Algorithm Developer"],
                      "essayQuestions": [
                        { "prompt": "Common fallback question", "maxLength": 300 }
                      ],
                      "roleEssayQuestions": {
                        "Robot Automation": [
                          { "prompt": "Summarize your core job competency.", "maxLength": 300 },
                          { "prompt": "Why are you applying to Taewoong Logistics?", "maxLength": 700 }
                        ],
                        "Algorithm Developer": [
                          { "prompt": "Describe your algorithm development experience.", "maxLength": 500 }
                        ]
                      }
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data", hasSize(2)))
            .andReturn()
            .getResponse()
            .getContentAsString();

        JsonNode saved = objectMapper.readTree(savedBody);
        long robotWorkspaceId = saved.at("/data/0/workspaceId").asLong();
        long algorithmWorkspaceId = saved.at("/data/1/workspaceId").asLong();

        mockMvc.perform(get("/api/workspaces/%d".formatted(robotWorkspaceId)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.positionTitle").value("Robot Automation"))
            .andExpect(jsonPath("$.data.questions[0].prompt").value("Summarize your core job competency."))
            .andExpect(jsonPath("$.data.questions[0].maxLength").value(300))
            .andExpect(jsonPath("$.data.questions[1].prompt").value("Why are you applying to Taewoong Logistics?"))
            .andExpect(jsonPath("$.data.questions[1].maxLength").value(700));

        mockMvc.perform(get("/api/workspaces/%d".formatted(algorithmWorkspaceId)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.positionTitle").value("Algorithm Developer"))
            .andExpect(jsonPath("$.data.questions[0].prompt").value("Describe your algorithm development experience."))
            .andExpect(jsonPath("$.data.questions[0].maxLength").value(500));
    }

    @Test
    void extensionSaveRejectsInvalidSourceUrl() throws Exception {
        mockMvc.perform(post("/api/extension/jobs/save")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "companyName": "Invalid Extension Company",
                      "positionTitle": "Server Engineer",
                      "deadlineLabel": "D-6",
                      "sourceUrl": "not-a-url",
                      "selectedRoles": ["Backend"],
                      "essayQuestions": []
                    }
                    """))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }

    @Test
    void extensionSaveAcceptsActualJasoseolBranchPayload() throws Exception {
        mockMvc.perform(post("/api/extension/jobs/save")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "companyName": "자소설닷컴",
                      "positionTitle": "각 직군별 신입 및 경력을 모집합니다",
                      "deadlineLabel": "2022-01-31T23:59:00.000+09:00",
                      "sourceUrl": "https://jasoseol.com/recruit/51271",
                      "selectedRoles": [
                        "iOS 개발자",
                        "퍼포먼스 마케터",
                        "웹 프론트엔드",
                        "광고운영 담당자",
                        "서비스 기획자",
                        "광고 운영지원",
                        "CXO(Customer eXperience Operator)"
                      ],
                      "essayQuestions": []
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.length()").value(7))
            .andExpect(jsonPath("$.data[0].workspaceId", notNullValue()))
            .andExpect(jsonPath("$.data[0].positionTitle").value("iOS 개발자"))
            .andExpect(jsonPath("$.data[6].workspaceId", notNullValue()))
            .andExpect(jsonPath("$.data[6].positionTitle").value("CXO(Customer eXperience Operator)"));
    }

    @Test
    void extensionSaveDoesNotTreatDifferentCompaniesAsDuplicatesForSameUrlAndRole() throws Exception {
        mockMvc.perform(post("/api/extension/jobs/save")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "companyName": "BGF로지스",
                      "positionTitle": "2026년 하계 채용연계형 인턴 채용",
                      "deadlineLabel": "2026년 6월 15일 23:59",
                      "sourceUrl": "https://jasoseol.com/?campaignid=15830248521",
                      "selectedRoles": ["재무지원팀 - 회계"],
                      "essayQuestions": []
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[0].companyName").value("BGF로지스"))
            .andExpect(jsonPath("$.data[0].positionTitle").value("재무지원팀 - 회계"));

        mockMvc.perform(post("/api/extension/jobs/save")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "companyName": "다른회사",
                      "positionTitle": "2026년 하계 채용연계형 인턴 채용",
                      "deadlineLabel": "2026년 6월 20일 23:59",
                      "sourceUrl": "https://jasoseol.com/?campaignid=15830248521",
                      "selectedRoles": ["재무지원팀 - 회계"],
                      "essayQuestions": []
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[0].companyName").value("다른회사"))
            .andExpect(jsonPath("$.data[0].positionTitle").value("재무지원팀 - 회계"));
    }

    @Test
    void extensionSaveRejectsBlankSelectedRoles() throws Exception {
        mockMvc.perform(post("/api/extension/jobs/save")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "companyName": "자소설닷컴",
                      "positionTitle": "",
                      "deadlineLabel": "D-6",
                      "sourceUrl": "https://jasoseol.com/recruit/51271",
                      "selectedRoles": [" ", ""],
                      "essayQuestions": []
                    }
                    """))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.error.message").value("At least one role is required."));
    }

    @Test
    void mattermostWebhookRequiresSecretAndStoresJobCandidate() throws Exception {
        mockMvc.perform(post("/api/integrations/mattermost/webhook")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "channelId": "jobs-channel",
                      "messageId": "mm-contract-1",
                      "senderName": "recruiter",
                      "text": "[라인] Server Platform Engineer 채용 https://careers.linecorp.com/jobs/101 마감 D-7",
                      "attachments": [],
                      "rawPayload": { "team": "employment" }
                    }
                    """))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.success").value(false));

        mockMvc.perform(post("/api/integrations/mattermost/webhook")
                .header("X-MM-Webhook-Secret", "test-mm-secret")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "channelId": "jobs-channel",
                      "messageId": "mm-contract-1",
                      "senderName": "recruiter",
                      "text": "[라인] Server Platform Engineer 채용 https://careers.linecorp.com/jobs/101 마감 D-7",
                      "attachments": [],
                      "rawPayload": { "team": "employment" }
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.messageType").value("JOB_POSTING"))
            .andExpect(jsonPath("$.data.parseStatus").value("PARSED"))
            .andExpect(jsonPath("$.data.createdParsedJobPost").value(true));
    }

    @Test
    void mattermostWebhookAcceptsOutgoingWebhookTokenAndSnakeCasePayload() throws Exception {
        mockMvc.perform(post("/api/integrations/mattermost/webhook")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "token": "test-mm-secret",
                      "channel_id": "jobs-channel",
                      "post_id": "mm-contract-snake-1",
                      "user_name": "recruiter",
                      "text": "Line / Server Platform Engineer / -D-7\\nhttps://careers.linecorp.com/jobs/102",
                      "attachments": []
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.messageType").value("JOB_POSTING"))
            .andExpect(jsonPath("$.data.parseStatus").value("PARSED"))
            .andExpect(jsonPath("$.data.createdParsedJobPost").value(true));
    }

    @Test
    void mattermostWebhookAcceptsAnyConfiguredChannelToken() throws Exception {
        mockMvc.perform(post("/api/integrations/mattermost/webhook")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "token": "channel-two-secret",
                      "channel_id": "jobs-channel-two",
                      "post_id": "mm-contract-channel-2",
                      "user_name": "recruiter",
                      "text": "카카오 / Backend Developer / -D-5\\nhttps://careers.kakao.com/jobs/105",
                      "attachments": []
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.messageType").value("JOB_POSTING"))
            .andExpect(jsonPath("$.data.parseStatus").value("PARSED"))
            .andExpect(jsonPath("$.data.createdParsedJobPost").value(true));

        mockMvc.perform(post("/api/integrations/mattermost/webhook")
                .header("X-MM-Webhook-Secret", "channel-two-secret")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "channel_id": "jobs-channel-two",
                      "post_id": "mm-contract-channel-2-header",
                      "user_name": "recruiter",
                      "text": "네이버 / Platform Engineer / -D-4\\nhttps://recruit.navercorp.com/jobs/104",
                      "attachments": []
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.messageType").value("JOB_POSTING"))
            .andExpect(jsonPath("$.data.parseStatus").value("PARSED"))
            .andExpect(jsonPath("$.data.createdParsedJobPost").value(true));

        mockMvc.perform(post("/api/integrations/mattermost/webhook")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "token": "wrong-secret",
                      "channel_id": "jobs-channel-two",
                      "post_id": "mm-contract-channel-2-wrong",
                      "user_name": "recruiter",
                      "text": "라인 / Server Developer / -D-3\\nhttps://careers.linecorp.com/jobs/103",
                      "attachments": []
                    }
                    """))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void mattermostRecommendationsAreOnlyAvailableToSsafyUsers() throws Exception {
        mockMvc.perform(get("/api/recommendations/jobs?source=mattermost"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true));

        mockMvc.perform(get("/api/recommendations/jobs?source=mattermost").with(user("2")))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.error.code").value("FORBIDDEN"));
    }

    @Test
    void mattermostRecommendationsPassDeadlineModeToService() throws Exception {
        when(mattermostRecommendationService.listRecommendations(1L, "exact")).thenReturn(List.of());

        mockMvc.perform(get("/api/recommendations/jobs?source=mattermost&deadlineMode=exact"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true));

        verify(mattermostRecommendationService).listRecommendations(1L, "exact");
    }

    private void createDashboardJob(String companyName, String deadlineLabel) throws Exception {
        mockMvc.perform(post("/api/basket/jobs")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "companyName": "%s",
                      "positionTitle": "Backend Developer",
                      "deadlineLabel": "%s",
                      "sourceUrl": "https://example.com/jobs/%s",
                      "savedSource": "DIRECT"
                    }
                    """.formatted(companyName, deadlineLabel, companyName.replace(" ", "-").toLowerCase())))
            .andExpect(status().isOk());
    }
}
