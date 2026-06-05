package com.ezone.backend.controller;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.ezone.backend.config.SecurityConfig;
import com.ezone.backend.domain.UserAccount;
import com.ezone.backend.mapper.UserAccountMapper;
import com.ezone.backend.security.JwtAccessTokenVerifier;
import com.ezone.backend.security.JwtAuthenticationFilter;
import com.ezone.backend.service.InMemoryP1WorkspaceService;
import com.ezone.backend.service.InMemoryProfileService;
import com.ezone.backend.service.NotionIntegrationService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest({
    DashboardController.class,
    BasketJobController.class,
    WorkspaceController.class,
    ReferenceController.class,
    RecommendationController.class,
    ProfileController.class,
    CurrentUserController.class,
    NotionIntegrationController.class,
    ExtensionJobController.class
})
@Import({
    SecurityConfig.class,
    JwtAuthenticationFilter.class,
    JwtAccessTokenVerifier.class,
    InMemoryP1WorkspaceService.class,
    InMemoryProfileService.class,
    NotionIntegrationService.class
})
@WithMockUser(username = "1")
class P1ApiContractTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private UserAccountMapper userAccountMapper;

    @BeforeEach
    void setUp() {
        when(userAccountMapper.findById(1L)).thenReturn(Optional.of(new UserAccount(
            1L,
            "google-subject",
            "user@example.com",
            "Hong Gil Dong",
            "Gil Dong",
            true
        )));
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
    void workspaceDefaultsExposeDocumentProfileSections() throws Exception {
        mockMvc.perform(get("/api/workspaces/102/defaults"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.sections.projects", notNullValue()))
            .andExpect(jsonPath("$.data.sections.awards", notNullValue()));
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
            .andExpect(jsonPath("$.data.companyName").value("Example Labs"))
            .andExpect(jsonPath("$.data.companyDetails.domain").value("careers.example.com"))
            .andExpect(jsonPath("$.data.companyDetails.companyType").value("미확인"))
            .andExpect(jsonPath("$.data.companyDetails.size").value("미확인"))
            .andExpect(jsonPath("$.data.companyDetails.financialStatus").value("unverified"));
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
    void duplicateBasketJobUsesCompanyAndPositionRegardlessOfUrl() throws Exception {
        String firstBody = mockMvc.perform(post("/api/basket/jobs")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "companyName": "Duplicate Company",
                      "positionTitle": "Backend Developer",
                      "deadlineLabel": "D-6",
                      "sourceUrl": "https://example.com/jobs/first",
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
                      "sourceUrl": "https://example.com/jobs/second",
                      "savedSource": "DIRECT"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.id").value(firstBasketJobId))
            .andExpect(jsonPath("$.data.workspaceId").value(firstWorkspaceId))
            .andExpect(jsonPath("$.data.sourceUrl").value("https://example.com/jobs/first"));
    }

    @Test
    void basketStatusLabelsFollowStandardFourStatusMeanings() throws Exception {
        String createdBody = mockMvc.perform(post("/api/basket/jobs")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "companyName": "Status Company",
                      "positionTitle": "Backend Developer",
                      "deadlineLabel": "2026.06.30",
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

        mockMvc.perform(post("/api/document-profile/custom-fields")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "label": "Portfolio",
                      "fieldType": "URL",
                      "value": "https://example.com"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.label").value("Portfolio"))
            .andExpect(jsonPath("$.data.fieldType").value("URL"));

        mockMvc.perform(patch("/api/document-profile/custom-fields/301")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "label": "Portfolio Updated",
                      "fieldType": "URL",
                      "value": "https://example.com/updated"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.label").value("Portfolio Updated"));

        mockMvc.perform(delete("/api/document-profile/custom-fields/301"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true));

        mockMvc.perform(get("/api/integrations/notion"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.syncScope").value("JOB_ONLY"));
    }

    @Test
    void savingBasketJobRecordsJobOnlyNotionSyncLogWhenEnabled() throws Exception {
        mockMvc.perform(post("/api/integrations/notion/connect")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    { "code": "oauth-code" }
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
            .andExpect(jsonPath("$.data[0].target").value("BASKET_JOB"))
            .andExpect(jsonPath("$.data[0].status").value("SUCCESS"))
            .andExpect(jsonPath("$.data[0].message").value("JOB_ONLY synced: Notion Sync Company / Backend Developer"));
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
