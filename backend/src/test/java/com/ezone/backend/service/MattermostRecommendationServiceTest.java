package com.ezone.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.groups.Tuple.tuple;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ezone.backend.domain.persistence.MattermostParsedJobPostRow;
import com.ezone.backend.dto.basket.BasketJobResponse;
import com.ezone.backend.dto.basket.CreateBasketJobRequest;
import com.ezone.backend.dto.dashboard.DashboardJobResponse;
import com.ezone.backend.mapper.MattermostMapper;
import com.ezone.backend.mapper.UserProfileMapper;
import java.time.LocalDate;
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
    private final MattermostRecommendationScoringService scoringService = Mockito.mock(MattermostRecommendationScoringService.class);
    private final UserProfileMapper userProfileMapper = Mockito.mock(UserProfileMapper.class);
    private final MattermostRecommendationService service = new MattermostRecommendationService(
        mattermostMapper,
        workspaceSupport,
        workspaceService,
        Optional.of(aiClient),
        scoringService,
        userProfileMapper
    );

    @Test
    void listOpenRecommendationsExcludesExpiredJobsAndQueuesMissingAiScoresWithoutSynchronousAiCalls() {
        MattermostParsedJobPostRow expired = candidate(1L, "Expired", "Backend Developer", "2026.01.01");
        MattermostParsedJobPostRow open = candidate(2L, "Line", "AI Platform Engineer", "상시/수시/채용 시 마감 공고");
        MattermostParsedJobPostRow approved = candidate(3L, "Kakao", "서비스 개발자", "D-5");
        approved.setReviewStatus("APPROVED");
        approved.setRecommendationScore(92);
        approved.setRecommendationReason("저장된 AI 추천도 기준으로 직무 적합도가 높습니다.");
        approved.setRecommendationStatus("READY");
        approved.setRecommendationModelVersion("gms:gpt-4.1-mini:mm-review-priority-v5:profile-8c7cd9b945f2");
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
                tuple(2L, "Line", "채용 시 마감")
            );
        assertThat(recommendations.get(0).recommendationScore()).isEqualTo(92);
        assertThat(recommendations.get(0).recommendationReason()).contains("저장된 AI 추천도");
        assertThat(recommendations.get(1).recommendationScore()).isNull();
        assertThat(recommendations.get(1).recommendationReason()).isEqualTo("추천도 계산 대기 중입니다.");
        verify(mattermostMapper).insertPendingRecommendationScoreIfAbsent(1L, 2L, "gms:gpt-4.1-mini:mm-review-priority-v5:profile-8c7cd9b945f2");
        verify(scoringService).scoreCandidates(eq(1L), any(), any(), eq("gms:gpt-4.1-mini:mm-review-priority-v5:profile-8c7cd9b945f2"));
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
        assertThat(recommendations.get(0).recommendationReason()).isEqualTo("추천도 계산 대기 중입니다.");
        verify(aiClient, never()).recommend(any());
    }

    @Test
    void listOpenRecommendationsRequeuesStoredScoresFromOlderModelVersion() {
        MattermostParsedJobPostRow stale = candidate(17L, "Line", "Backend Engineer", "D-7");
        stale.setRecommendationScore(85);
        stale.setRecommendationReason("Rule fallback score");
        stale.setRecommendationStatus("READY");
        stale.setRecommendationModelVersion("rule-fallback-v0");
        when(mattermostMapper.listRecommendationCandidates(1L)).thenReturn(List.of(stale));

        List<DashboardJobResponse> recommendations = service.listOpenRecommendations(1L);

        assertThat(recommendations).hasSize(1);
        assertThat(recommendations.get(0).recommendationScore()).isNull();
        assertThat(recommendations.get(0).recommendationReason()).isNotEqualTo("Rule fallback score");
        verify(mattermostMapper).insertPendingRecommendationScoreIfAbsent(1L, 17L, "gms:gpt-4.1-mini:mm-review-priority-v5:profile-8c7cd9b945f2");
        verify(scoringService).scoreCandidates(eq(1L), any(), any(), eq("gms:gpt-4.1-mini:mm-review-priority-v5:profile-8c7cd9b945f2"));
    }

    @Test
    void listOpenRecommendationsKeepsStoredScoresFromCurrentModelVersion() {
        MattermostParsedJobPostRow current = candidate(18L, "Line", "Backend Engineer", "D-7");
        current.setRecommendationScore(91);
        current.setRecommendationReason("Current AI score");
        current.setRecommendationStatus("READY");
        current.setRecommendationModelVersion("gms:gpt-4.1-mini:mm-review-priority-v5:profile-8c7cd9b945f2");
        when(userProfileMapper.findByUserId(1L)).thenReturn(Optional.empty());
        when(mattermostMapper.listRecommendationCandidates(1L)).thenReturn(List.of(current));

        List<DashboardJobResponse> recommendations = service.listOpenRecommendations(1L);

        assertThat(recommendations).hasSize(1);
        assertThat(recommendations.get(0).recommendationScore()).isEqualTo(91);
        verify(mattermostMapper, never()).insertPendingRecommendationScoreIfAbsent(any(), any(), any());
        verify(scoringService, never()).scoreCandidates(eq(1L), any(), any(), any());
    }

    @Test
    void listOpenRecommendationsDoesNotInventScoreBeforeAiReturnsReadyResult() {
        MattermostParsedJobPostRow unscored = candidate(23L, "Line", "Backend Engineer", "D-7");
        when(userProfileMapper.findByUserId(1L)).thenReturn(Optional.empty());
        when(mattermostMapper.listRecommendationCandidates(1L)).thenReturn(List.of(unscored));

        List<DashboardJobResponse> recommendations = service.listOpenRecommendations(1L);

        assertThat(recommendations).hasSize(1);
        assertThat(recommendations.get(0).recommendationScore()).isNull();
        assertThat(recommendations.get(0).recommendationStatus()).isEqualTo("PENDING");
        assertThat(recommendations.get(0).recommendationReason()).isEqualTo("추천도 계산 대기 중입니다.");
    }

    @Test
    void listOpenRecommendationsRequeuesAiScoreWhenOnboardingProfileFingerprintChanges() {
        MattermostParsedJobPostRow stale = candidate(24L, "Line", "Backend Engineer", "D-7");
        stale.setRecommendationScore(91);
        stale.setRecommendationReason("Old profile AI score");
        stale.setRecommendationStatus("READY");
        stale.setRecommendationModelVersion("gms:gpt-4.1-mini:mm-review-priority-v5:profile-old");
        when(userProfileMapper.findByUserId(1L)).thenReturn(Optional.of(new com.ezone.backend.domain.persistence.UserProfileRow(
            1L,
            "[\"백엔드\"]",
            "[\"대기업\"]",
            "[\"IT\"]",
            "[\"서울\"]",
            "[\"Java\",\"Spring\"]",
            true,
            true
        )));
        when(mattermostMapper.listRecommendationCandidates(1L)).thenReturn(List.of(stale));

        List<DashboardJobResponse> recommendations = service.listOpenRecommendations(1L);

        assertThat(recommendations).hasSize(1);
        assertThat(recommendations.get(0).recommendationScore()).isNull();
        assertThat(recommendations.get(0).recommendationStatus()).isEqualTo("PENDING");
        verify(mattermostMapper).insertPendingRecommendationScoreIfAbsent(eq(1L), eq(24L), org.mockito.ArgumentMatchers.startsWith("gms:gpt-4.1-mini:mm-review-priority-v5:profile-"));
        verify(scoringService).scoreCandidates(eq(1L), any(), any(), org.mockito.ArgumentMatchers.startsWith("gms:gpt-4.1-mini:mm-review-priority-v5:profile-"));
    }

    @Test
    void listOpenRecommendationsHidesAllStaleScoresEvenWhenOnlySomeAreQueuedForTokenBudget() {
        List<MattermostParsedJobPostRow> staleRows = java.util.stream.LongStream.rangeClosed(30L, 59L)
            .mapToObj(id -> {
                MattermostParsedJobPostRow row = candidate(id, "Company " + id, "Backend Engineer", "D-7");
                row.setRecommendationScore(80);
                row.setRecommendationReason("Old score");
                row.setRecommendationStatus("READY");
                row.setRecommendationModelVersion("old-model");
                return row;
            })
            .toList();
        when(userProfileMapper.findByUserId(1L)).thenReturn(Optional.empty());
        when(mattermostMapper.listRecommendationCandidates(1L)).thenReturn(staleRows);

        List<DashboardJobResponse> recommendations = service.listOpenRecommendations(1L);

        assertThat(recommendations).hasSize(30);
        assertThat(recommendations)
            .allSatisfy(response -> {
                assertThat(response.recommendationScore()).isNull();
                assertThat(response.recommendationStatus()).isEqualTo("PENDING");
            });
        verify(scoringService).scoreCandidates(eq(1L), org.mockito.ArgumentMatchers.argThat(rows -> rows.size() == 24), any(), any());
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
        MattermostParsedJobPostRow dueDate = candidate(7L, "Toss", "Data Engineer", "12/31(목)");
        when(mattermostMapper.listRecommendationCandidates(1L)).thenReturn(List.of(today, unknown, dueDate));

        List<DashboardJobResponse> recommendations = service.listOpenRecommendations(1L);

        assertThat(recommendations)
            .extracting(DashboardJobResponse::deadlineLabel)
            .contains("오늘 마감", "마감일 미확인", "2026.12.31");
    }

    @Test
    void listExactDeadlineRecommendationsShowsDatedMattermostPostsEvenWhenAlreadyClosed() {
        MattermostParsedJobPostRow recentClosed = candidate(41L, "Recent", "Backend Engineer", "04/30(목)");
        MattermostParsedJobPostRow olderClosed = candidate(42L, "Older", "Backend Engineer", "03/31(화)");
        MattermostParsedJobPostRow flexible = candidate(43L, "Flexible", "Backend Engineer", "상시/수시/채용 시 마감 공고");
        when(userProfileMapper.findByUserId(1L)).thenReturn(Optional.empty());
        when(mattermostMapper.listRecommendationCandidates(1L)).thenReturn(List.of(olderClosed, flexible, recentClosed));

        List<DashboardJobResponse> recommendations = service.listRecommendations(1L, "exact");

        assertThat(recommendations)
            .extracting(DashboardJobResponse::basketJobId, DashboardJobResponse::deadlineLabel)
            .containsExactly(
                tuple(41L, "2026.04.30"),
                tuple(42L, "2026.03.31")
            );
    }

    @Test
    void listExactDeadlineRecommendationsPrioritizesReadyScoresAndDiversifiesCompaniesForDemo() {
        MattermostParsedJobPostRow firstBoss = candidate(51L, "보스반도체", "AI SW Engineer", "05/13(수)");
        firstBoss.setRecommendationStatus("PENDING");
        MattermostParsedJobPostRow secondBoss = candidate(52L, "보스반도체", "ML Systems Runtime Engineer", "05/13(수)");
        secondBoss.setRecommendationStatus("PENDING");
        MattermostParsedJobPostRow agile = candidate(53L, "애자일소다", "생성형 AI 데이터사이언티스트", "05/12(화)");
        agile.setRecommendationScore(88);
        agile.setRecommendationReason("애자일소다의 생성형 AI 데이터사이언티스트 공고는 AI 기술과 서울 근무지가 연결됩니다.");
        agile.setRecommendationStatus("READY");
        agile.setRecommendationModelVersion("gms:gpt-4.1-mini:mm-review-priority-v5:profile-8c7cd9b945f2");
        when(mattermostMapper.listRecommendationCandidates(1L)).thenReturn(List.of(firstBoss, secondBoss, agile));

        List<DashboardJobResponse> recommendations = service.listRecommendations(1L, "exact");

        assertThat(recommendations)
            .extracting(DashboardJobResponse::companyName)
            .containsExactly("애자일소다", "보스반도체", "보스반도체");
        assertThat(recommendations.get(0).recommendationStatus()).isEqualTo("READY");
    }

    @Test
    void listExactDeadlineRecommendationsProvidesLogoDomainsForDemoCompanies() {
        MattermostParsedJobPostRow boss = candidate(61L, "보스반도체", "AI SW Engineer", "05/13(수)");
        MattermostParsedJobPostRow agile = candidate(62L, "애자일소다", "AI 플랫폼 시스템 엔지니어", "05/12(화)");
        MattermostParsedJobPostRow kbank = candidate(63L, "케이뱅크", "백엔드 개발", "04/24(금)");
        when(mattermostMapper.listRecommendationCandidates(1L)).thenReturn(List.of(boss, agile, kbank));

        List<DashboardJobResponse> recommendations = service.listRecommendations(1L, "exact");

        assertThat(recommendations)
            .extracting(DashboardJobResponse::companyName, DashboardJobResponse::companyDomain, DashboardJobResponse::companyLogoUrl)
            .contains(
                tuple("보스반도체", "boss-semi.com", "https://www.google.com/s2/favicons?domain=boss-semi.com&sz=128"),
                tuple("애자일소다", "agilesoda.ai", "https://www.google.com/s2/favicons?domain=agilesoda.ai&sz=128"),
                tuple("케이뱅크", "kbanknow.com", "https://www.google.com/s2/favicons?domain=kbanknow.com&sz=128")
            );
    }

    @Test
    void listExactDeadlineRecommendationsUsesDirectLogoForKoreanRegister() {
        MattermostParsedJobPostRow koreanRegister = candidate(64L, "한국선급", "AI융합기술연구 및 AI서비스 개발", "04/23(목)");
        when(mattermostMapper.listRecommendationCandidates(1L)).thenReturn(List.of(koreanRegister));

        List<DashboardJobResponse> recommendations = service.listRecommendations(1L, "exact");

        assertThat(recommendations)
            .extracting(DashboardJobResponse::companyName, DashboardJobResponse::companyDomain, DashboardJobResponse::companyLogoUrl)
            .containsExactly(tuple("한국선급", "krs.co.kr", "https://www.krs.co.kr/images/common/logo.png"));
    }

    @Test
    void listExactDeadlineRecommendationsMatchesCompanyNameWithCorpMarker() {
        MattermostParsedJobPostRow snet = candidate(65L, "에스넷시스템㈜", "AI 개발 담당자", "03/15(일)");
        when(mattermostMapper.listRecommendationCandidates(1L)).thenReturn(List.of(snet));

        List<DashboardJobResponse> recommendations = service.listRecommendations(1L, "exact");

        assertThat(recommendations)
            .extracting(DashboardJobResponse::companyName, DashboardJobResponse::companyDomain, DashboardJobResponse::companyLogoUrl)
            .containsExactly(tuple(
                "에스넷시스템㈜",
                "snetsystems.co.kr",
                "https://media-cdn.linkareer.com/activity_manager/logos/758556?d=208xauto"
            ));
    }

    @Test
    void listOpenRecommendationsShowsFlexibleDeadlinePhraseAsClosingWhenHired() {
        MattermostParsedJobPostRow flexible = candidate(19L, "Nudge Healthcare", "Backend Engineer", "상시/수시/채용 시 마감 공고");
        when(mattermostMapper.listRecommendationCandidates(1L)).thenReturn(List.of(flexible));

        List<DashboardJobResponse> recommendations = service.listOpenRecommendations(1L);

        assertThat(recommendations)
            .extracting(DashboardJobResponse::deadlineLabel)
            .containsExactly("채용 시 마감");
    }

    @Test
    void listOpenRecommendationsPrefersRawFlexibleDeadlineOverStaleNormalizedAlwaysOpenLabel() {
        MattermostParsedJobPostRow flexible = candidate(20L, "Nudge Healthcare", "Backend Engineer", "상시/수시/채용 시 마감 공고");
        flexible.setNormalizedDeadlineLabel("상시 채용");
        when(mattermostMapper.listRecommendationCandidates(1L)).thenReturn(List.of(flexible));

        List<DashboardJobResponse> recommendations = service.listOpenRecommendations(1L);

        assertThat(recommendations)
            .extracting(DashboardJobResponse::deadlineLabel)
            .containsExactly("채용 시 마감");
    }

    @Test
    void listOpenRecommendationsUsesPersistedNormalizedDeadlineFieldsForOpenFiltering() {
        MattermostParsedJobPostRow normalizedOpen = candidate(11L, "Future", "Backend Engineer", "2026.01.01");
        normalizedOpen.setDeadlineType("DATE");
        normalizedOpen.setDeadlineDate(LocalDate.now().plusDays(5).toString());
        normalizedOpen.setNormalizedDeadlineLabel("D-5");
        MattermostParsedJobPostRow normalizedExpired = candidate(12L, "Past", "Data Engineer", "상시/수시/채용 시 마감 공고");
        normalizedExpired.setDeadlineType("DATE");
        normalizedExpired.setDeadlineDate(LocalDate.now().minusDays(1).toString());
        normalizedExpired.setNormalizedDeadlineLabel("마감됨");
        when(mattermostMapper.listRecommendationCandidates(1L)).thenReturn(List.of(normalizedOpen, normalizedExpired));

        List<DashboardJobResponse> recommendations = service.listOpenRecommendations(1L);

        assertThat(recommendations)
            .extracting(DashboardJobResponse::basketJobId, DashboardJobResponse::deadlineLabel)
            .containsExactly(tuple(11L, "D-5"));
    }

    @Test
    void listOpenRecommendationsRemovesDuplicateCandidatesBySourceUrlAndKeepsScoredRepresentative() {
        MattermostParsedJobPostRow pendingDuplicate = candidate(15L, "Channel Corp", "Frontend Engineer", "상시 채용");
        pendingDuplicate.setUrl("https://www.wanted.co.kr/wd/324638/");
        MattermostParsedJobPostRow scoredDuplicate = candidate(16L, "Channel Corp", "Frontend Engineer", "상시 채용");
        scoredDuplicate.setUrl("https://www.wanted.co.kr/wd/324638");
        scoredDuplicate.setRecommendationScore(88);
        scoredDuplicate.setRecommendationReason("저장된 AI 추천도 기준으로 우선 검토할 만합니다.");
        scoredDuplicate.setRecommendationStatus("READY");
        scoredDuplicate.setRecommendationModelVersion("gms:gpt-4.1-mini:mm-review-priority-v5:profile-8c7cd9b945f2");
        when(mattermostMapper.listRecommendationCandidates(1L)).thenReturn(List.of(pendingDuplicate, scoredDuplicate));

        List<DashboardJobResponse> recommendations = service.listOpenRecommendations(1L);

        assertThat(recommendations)
            .extracting(DashboardJobResponse::basketJobId, DashboardJobResponse::recommendationScore)
            .containsExactly(tuple(16L, 88));
        verify(scoringService, never()).scoreCandidates(eq(1L), any(), any(), any());
    }

    @Test
    void listOpenRecommendationsHandlesDuplicateCandidatesWithoutScores() {
        MattermostParsedJobPostRow first = candidate(21L, "Nudge Healthcare", "Backend Engineer", "채용 시 마감");
        first.setUrl("https://www.wanted.co.kr/wd/85836/");
        MattermostParsedJobPostRow second = candidate(22L, "Nudge Healthcare", "Backend Engineer", "채용 시 마감");
        second.setUrl("https://www.wanted.co.kr/wd/85836");
        when(mattermostMapper.listRecommendationCandidates(1L)).thenReturn(List.of(first, second));

        List<DashboardJobResponse> recommendations = service.listOpenRecommendations(1L);

        assertThat(recommendations)
            .extracting(DashboardJobResponse::basketJobId)
            .containsExactly(21L);
        verify(mattermostMapper).insertPendingRecommendationScoreIfAbsent(1L, 21L, "gms:gpt-4.1-mini:mm-review-priority-v5:profile-8c7cd9b945f2");
        verify(scoringService).scoreCandidates(eq(1L), any(), any(), eq("gms:gpt-4.1-mini:mm-review-priority-v5:profile-8c7cd9b945f2"));
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

    @Test
    void saveRecommendationPrefersRawFlexibleDeadlineOverStaleNormalizedLabel() {
        MattermostParsedJobPostRow candidate = candidate(10L, "Line", "Server Platform Engineer", "상시/수시/채용 시 마감 공고");
        candidate.setNormalizedDeadlineLabel("상시 채용");
        when(mattermostMapper.findParsedJobPost(10L)).thenReturn(Optional.of(candidate));
        when(workspaceSupport.promoteMattermostJob(candidate)).thenReturn(902L);
        when(workspaceService.createBasketJob(Mockito.eq(1L), Mockito.any(CreateBasketJobRequest.class)))
            .thenReturn(new BasketJobResponse(
                201L,
                202L,
                "Line",
                "Server Platform Engineer",
                null,
                "지원전",
                "상시 채용",
                null,
                true,
                null,
                "https://careers.example.com/jobs/10",
                ""
            ));

        service.saveRecommendation(1L, 10L);

        ArgumentCaptor<CreateBasketJobRequest> requestCaptor = ArgumentCaptor.forClass(CreateBasketJobRequest.class);
        verify(workspaceService).createBasketJob(Mockito.eq(1L), requestCaptor.capture());
        assertThat(requestCaptor.getValue().deadlineLabel()).isEqualTo("채용 시 마감");
    }

    @Test
    void saveRecommendationRejectsRejectedCandidate() {
        MattermostParsedJobPostRow candidate = candidate(13L, "Line", "Server Platform Engineer", "D-7");
        candidate.setReviewStatus("REJECTED");
        when(mattermostMapper.findParsedJobPost(13L)).thenReturn(Optional.of(candidate));

        assertThatThrownBy(() -> service.saveRecommendation(1L, 13L))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("not available");
        verify(workspaceService, never()).createBasketJob(any(), any());
    }

    @Test
    void saveRecommendationRejectsClosedCandidate() {
        MattermostParsedJobPostRow candidate = candidate(14L, "Line", "Server Platform Engineer", "상시/수시/채용 시 마감 공고");
        candidate.setDeadlineType("DATE");
        candidate.setDeadlineDate(LocalDate.now().minusDays(1).toString());
        candidate.setNormalizedDeadlineLabel("마감됨");
        when(mattermostMapper.findParsedJobPost(14L)).thenReturn(Optional.of(candidate));

        assertThatThrownBy(() -> service.saveRecommendation(1L, 14L))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("closed");
        verify(workspaceService, never()).createBasketJob(any(), any());
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
