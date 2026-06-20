package com.ezone.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.groups.Tuple.tuple;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ezone.backend.domain.persistence.MattermostParsedJobPostRow;
import com.ezone.backend.dto.basket.BasketJobResponse;
import com.ezone.backend.dto.basket.CreateBasketJobRequest;
import com.ezone.backend.dto.dashboard.DashboardJobResponse;
import com.ezone.backend.mapper.MattermostMapper;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

class MattermostRecommendationServiceTest {

    private final MattermostMapper mattermostMapper = Mockito.mock(MattermostMapper.class);
    private final P1WorkspaceMapperSupport workspaceSupport = Mockito.mock(P1WorkspaceMapperSupport.class);
    private final P1WorkspaceService workspaceService = Mockito.mock(P1WorkspaceService.class);
    private final AiJobRecommendationClient aiClient = Mockito.mock(AiJobRecommendationClient.class);
    private final MattermostRecommendationService service = new MattermostRecommendationService(
        mattermostMapper,
        workspaceSupport,
        workspaceService,
        Optional.of(aiClient)
    );

    @Test
    void listOpenRecommendationsExcludesExpiredJobsAndUsesStoredOrRuleSignalsWithoutAiCalls() {
        MattermostParsedJobPostRow expired = candidate(1L, "Expired", "Backend Developer", "2026.01.01");
        MattermostParsedJobPostRow open = candidate(2L, "Line", "AI Platform Engineer", "상시/수시/채용 시 마감 공고");
        MattermostParsedJobPostRow approved = candidate(3L, "Kakao", "서비스 개발자", "D-5");
        approved.setReviewStatus("APPROVED");
        approved.setRecommendationScore(92);
        approved.setRecommendationReason("저장된 AI 점수 기준으로 직무 적합도가 높음");
        approved.setRecommendationStatus("READY");
        when(mattermostMapper.listRecommendationCandidates(1L)).thenReturn(List.of(expired, open, approved));

        List<DashboardJobResponse> recommendations = service.listOpenRecommendations(1L);

        assertThat(recommendations)
            .extracting(
                DashboardJobResponse::basketJobId,
                DashboardJobResponse::companyName,
                DashboardJobResponse::deadlineLabel
            )
            .containsExactly(
                tuple(3L, "Kakao", "D-5"),
                tuple(2L, "Line", "상시 채용")
            );
        assertThat(recommendations.get(0).recommendationScore()).isEqualTo(92);
        assertThat(recommendations.get(0).recommendationReason()).contains("저장된 AI 점수");
        assertThat(recommendations.get(1).recommendationReason()).contains("직무");
        verify(aiClient, never()).recommend(any());
    }

    @Test
    void listOpenRecommendationsShowsPendingScoreWithoutCallingGmsAi() {
        MattermostParsedJobPostRow open = candidate(2L, "Line", "AI Platform Engineer", "D-9");
        open.setRecommendationStatus("PENDING");
        when(mattermostMapper.listRecommendationCandidates(1L)).thenReturn(List.of(open));

        List<DashboardJobResponse> recommendations = service.listOpenRecommendations(1L);

        assertThat(recommendations).hasSize(1);
        assertThat(recommendations.get(0).recommendationScore()).isNull();
        assertThat(recommendations.get(0).recommendationReason()).isEqualTo("AI 점수 계산 중");
        verify(aiClient, never()).recommend(any());
    }

    @Test
    void listOpenRecommendationsIncludesOfficialCompanyInfoForMattermostJobBoardUrls() {
        MattermostParsedJobPostRow open = candidate(4L, "업스테이지", "AI Tech Data Manager", "상시/수시/채용 시 마감 공고");
        open.setUrl("https://www.wanted.co.kr/wd/313220");
        open.setPostedAt("2026-04-16T15:26:00");
        open.setReceivedAt("2026-06-18T20:30:00");
        when(mattermostMapper.listRecommendationCandidates(1L)).thenReturn(List.of(open));

        List<DashboardJobResponse> recommendations = service.listOpenRecommendations(1L);

        assertThat(recommendations).hasSize(1);
        assertThat(recommendations.get(0).companyDomain()).isEqualTo("upstage.ai");
        assertThat(recommendations.get(0).companyType()).isEqualTo("스타트업");
        assertThat(recommendations.get(0).postedAt()).isEqualTo("2026-04-16T15:26:00");
        assertThat(recommendations.get(0).collectedAt()).isEqualTo("2026-06-18T20:30:00");
        assertThat(recommendations.get(0).companyLogoUrl())
            .isEqualTo("https://www.google.com/s2/favicons?domain=upstage.ai&sz=128");
    }

    @Test
    void listOpenRecommendationsNormalizesDeadlineLabelsForDisplay() {
        MattermostParsedJobPostRow today = candidate(5L, "Channel Corp", "Backend Engineer", "D-0");
        MattermostParsedJobPostRow unknown = candidate(6L, "Unknown", "Frontend Engineer", "");
        MattermostParsedJobPostRow dueDate = candidate(7L, "Toss", "Data Engineer", "12/31(화)");
        when(mattermostMapper.listRecommendationCandidates(1L)).thenReturn(List.of(today, unknown, dueDate));

        List<DashboardJobResponse> recommendations = service.listOpenRecommendations(1L);

        assertThat(recommendations)
            .extracting(DashboardJobResponse::deadlineLabel)
            .contains("오늘 마감", "마감일 미확인", "2026.12.31");
    }

    @Test
    void saveRecommendationPromotesCandidateThenSavesItToBasket() {
        MattermostParsedJobPostRow candidate = candidate(9L, "Line", "Server Platform Engineer", "D-7");
        candidate.setUrl("https://careers.linecorp.com/jobs/102");
        when(mattermostMapper.findParsedJobPost(9L)).thenReturn(Optional.of(candidate));
        when(workspaceSupport.promoteMattermostJob(candidate)).thenReturn(901L);
        when(workspaceService.createBasketJob(Mockito.eq(1L), Mockito.any(CreateBasketJobRequest.class)))
            .thenReturn(new BasketJobResponse(
                201L,
                202L,
                "Line",
                "Server Platform Engineer",
                null,
                "지원전",
                "D-7",
                null,
                true,
                "https://www.google.com/s2/favicons?domain=line.me&sz=128",
                "https://careers.linecorp.com/jobs/102",
                ""
            ));

        BasketJobResponse response = service.saveRecommendation(1L, 9L);

        assertThat(response.workspaceId()).isEqualTo(202L);
        verify(mattermostMapper).markParsedJobPostReviewed(9L, "APPROVED", 1L, 901L);
        ArgumentCaptor<CreateBasketJobRequest> requestCaptor = ArgumentCaptor.forClass(CreateBasketJobRequest.class);
        verify(workspaceService).createBasketJob(Mockito.eq(1L), requestCaptor.capture());
        assertThat(requestCaptor.getValue().savedSource()).isEqualTo("MATTERMOST");
        assertThat(requestCaptor.getValue().sourceUrl()).isEqualTo("https://careers.linecorp.com/jobs/102");
    }

    private MattermostParsedJobPostRow candidate(Long id, String companyName, String title, String deadlineLabel) {
        MattermostParsedJobPostRow row = new MattermostParsedJobPostRow();
        row.setId(id);
        row.setCompanyName(companyName);
        row.setTitle(title);
        row.setUrl("https://careers.example.com/jobs/" + id);
        row.setDeadlineLabel(deadlineLabel);
        row.setReviewStatus("NEEDS_REVIEW");
        return row;
    }
}
