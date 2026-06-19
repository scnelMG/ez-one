package com.ezone.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.groups.Tuple.tuple;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ezone.backend.domain.persistence.BasketJobRow;
import com.ezone.backend.domain.persistence.EssayQuestionRow;
import com.ezone.backend.domain.persistence.JobRow;
import com.ezone.backend.domain.persistence.WorkspaceRow;
import com.ezone.backend.dto.basket.CreateBasketJobRequest;
import com.ezone.backend.dto.dashboard.DashboardJobResponse;
import com.ezone.backend.mapper.ActivityMapper;
import com.ezone.backend.mapper.P1WorkspaceMapper;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class MyBatisP1WorkspaceServiceTest {

    @Mock
    private P1WorkspaceMapper mapper;

    @Mock
    private ActivityMapper activityMapper;

    @Mock
    private RealtimeCompanyEnrichmentService realtimeCompanyEnrichmentService;

    @InjectMocks
    private MyBatisP1WorkspaceService service;

    @Test
    void createBasketJobRecordsUnverifiedCompanyInfoSourceFromSavedUrl() {
        String sourceUrl = "https://careers.example.com/jobs/backend";
        when(mapper.findDuplicateBasketJob(1L, "Example Labs", sourceUrl, "Backend Developer")).thenReturn(Optional.empty());
        stubCreateBasketPersistence(10L, 20L, 30L, 40L);

        service.createBasketJob(1L, new CreateBasketJobRequest(
            null,
            "Example Labs",
            "Backend Developer",
            "D-15",
            sourceUrl,
            "https://example.com/logo.png",
            "MANUAL"
        ));

        verify(mapper).upsertCompany(argThat(row ->
            "https://example.com/logo.png".equals(row.getCompanyLogoUrl())
                && sourceUrl.equals(row.getLogoSourceUrl())
                && "DISCOVERED".equals(row.getLogoStatus())
        ));
        verify(mapper).upsertRuleBasedCompanyProfile(10L, "미확인", "careers.example.com");
        verify(mapper).recordCompanyInfoSource(10L, "SAVED_JOB_URL", sourceUrl, "UNVERIFIED");
    }

    @Test
    void createBasketJobUsesKnownCompanyDefaultsInsteadOfJasoseolDomain() {
        String sourceUrl = "https://jasoseol.com/recruit?rec=104614";
        String positionTitle = "인턴 · 정보보호 데이터 엔지니어";
        when(mapper.findDuplicateBasketJob(1L, "카카오뱅크", sourceUrl, positionTitle)).thenReturn(Optional.empty());
        stubCreateBasketPersistence(10L, 20L, 30L, 40L);

        service.createBasketJob(1L, new CreateBasketJobRequest(
            null,
            "카카오뱅크",
            positionTitle,
            "2026.07.03",
            sourceUrl,
            "",
            "MANUAL"
        ));

        verify(mapper).upsertCompany(argThat(row ->
            "카카오뱅크".equals(row.getCompanyName())
                && "kakaobank.com".equals(row.getCompanyDomain())
                && "대기업".equals(row.getCompanyType())
                && "대기업".equals(row.getCompanySize())
        ));
        verify(mapper).upsertOfficialCompanyProfile(
            10L,
            "금융",
            "https://www.kakaobank.com",
            "OFFICIAL_CLASSIFICATION",
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null
        );
    }

    @Test
    void createBasketJobPrefersOfficialCompanyClassificationOverJobBoardUrl() {
        String sourceUrl = "https://jasoseol.com/recruit?ec=104614";
        String positionTitle = "인턴 · 정보보호 데이터 엔지니어";
        when(mapper.findDuplicateBasketJob(1L, "카카오뱅크", sourceUrl, positionTitle)).thenReturn(Optional.empty());
        stubCreateBasketPersistence(10L, 20L, 30L, 40L);

        service.createBasketJob(1L, new CreateBasketJobRequest(
            null,
            "카카오뱅크",
            positionTitle,
            "2026.07.03",
            sourceUrl,
            "",
            "MANUAL"
        ));

        verify(mapper).upsertCompany(argThat(row ->
            "카카오뱅크".equals(row.getCompanyName())
                && "kakaobank.com".equals(row.getCompanyDomain())
                && "대기업".equals(row.getCompanyType())
                && "대기업".equals(row.getCompanySize())
        ));
        verify(mapper).upsertOfficialCompanyProfile(
            10L,
            "금융",
            "https://www.kakaobank.com",
            "OFFICIAL_CLASSIFICATION",
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null
        );
        verify(mapper).recordCompanyProfileSource(
            10L,
            "FTC_BUSINESS_GROUP",
            "공정거래위원회 기업집단포털",
            "https://www.egroup.go.kr/",
            "공시대상기업집단 소속회사 기준"
        );
    }

    @Test
    void createBasketJobEnrichesUnknownCompanyFromRealtimeOfficialProvider() {
        String sourceUrl = "https://jasoseol.com/recruit?rec=777";
        String positionTitle = "데이터 분석가";
        when(mapper.findDuplicateBasketJob(1L, "새공공기관", sourceUrl, positionTitle)).thenReturn(Optional.empty());
        when(realtimeCompanyEnrichmentService.enrich("새공공기관")).thenReturn(Optional.of(
            new RealtimeCompanyEnrichment(
                "public.example.or.kr",
                "공공기관",
                "공공기관",
                "공공",
                "https://public.example.or.kr",
                "1961-07-01",
                null,
                "기관유형: 공기업(시장형) · 주무부처: 기후에너지환경부 · 분야: 공공",
                "전라남도 나주시 전력로 55",
                "ALIO_PUBLIC_INSTITUTION",
                "ALIO 공공기관 경영정보 공개시스템",
                "https://alio.go.kr/",
                "공공기관 경영정보 공개시스템 기준"
            )
        ));
        stubCreateBasketPersistence(10L, 20L, 30L, 40L);

        service.createBasketJob(1L, new CreateBasketJobRequest(
            null,
            "새공공기관",
            positionTitle,
            "D-10",
            sourceUrl,
            "",
            "MANUAL"
        ));

        verify(mapper).updateCompanyClassification(10L, "public.example.or.kr", "공공기관", "공공기관");
        verify(mapper).upsertOfficialCompanyProfile(
            10L,
            "공공",
            "https://public.example.or.kr",
            "ALIO_PUBLIC_INSTITUTION",
            null,
            null,
            null,
            null,
            "1961-07-01",
            null,
            null,
            "기관유형: 공기업(시장형) · 주무부처: 기후에너지환경부 · 분야: 공공",
            "전라남도 나주시 전력로 55"
        );
        verify(mapper).recordCompanyProfileSource(
            10L,
            "ALIO_PUBLIC_INSTITUTION",
            "ALIO 공공기관 경영정보 공개시스템",
            "https://alio.go.kr/",
            "공공기관 경영정보 공개시스템 기준"
        );
    }

    @Test
    void createBasketJobDoesNotFailWhenRealtimeEnrichmentFails() {
        String sourceUrl = "https://careers.example.com/jobs/data";
        String positionTitle = "Data Analyst";
        when(mapper.findDuplicateBasketJob(1L, "Example Unknown", sourceUrl, positionTitle)).thenReturn(Optional.empty());
        doThrow(new IllegalStateException("api timeout")).when(realtimeCompanyEnrichmentService).enrich("Example Unknown");
        stubCreateBasketPersistence(10L, 20L, 30L, 40L);

        service.createBasketJob(1L, new CreateBasketJobRequest(
            null,
            "Example Unknown",
            positionTitle,
            "D-10",
            sourceUrl,
            "",
            "MANUAL"
        ));

        verify(mapper).upsertRuleBasedCompanyProfile(10L, "미확인", "careers.example.com");
        verify(mapper).insertBasketJob(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void createBasketJobMergesFinancialCommissionAndOpenDartCompanyProfileFields() {
        String sourceUrl = "https://jasoseol.com/recruit?rec=888";
        String positionTitle = "서비스 백엔드 개발자";
        when(mapper.findDuplicateBasketJob(1L, "네이버", sourceUrl, positionTitle)).thenReturn(Optional.empty());
        when(realtimeCompanyEnrichmentService.enrich("네이버")).thenReturn(Optional.of(
            new RealtimeCompanyEnrichment(
                "navercorp.com",
                "대기업",
                "대기업",
                "포털 및 기타 인터넷 정보매개 서비스업",
                "유가증권시장",
                "00266961",
                "035420",
                "2208162520",
                "https://www.navercorp.com",
                "1999-06-02",
                "최수연",
                4123,
                "인터넷 검색 포털 운영",
                "경기도 성남시 분당구 정자일로 95",
                "FINANCIAL_COMMISSION_COMPANY_BASIC",
                "금융위원회 기업기본정보",
                "https://www.data.go.kr/data/15043184/openapi.do",
                "공공데이터포털 금융위원회 기업기본정보 기준",
                List.of(
                    new RealtimeCompanyEnrichment.Source(
                        "FINANCIAL_COMMISSION_COMPANY_BASIC",
                        "금융위원회 기업기본정보",
                        "https://www.data.go.kr/data/15043184/openapi.do",
                        "공공데이터포털 금융위원회 기업기본정보 기준"
                    ),
                    new RealtimeCompanyEnrichment.Source(
                        "OPENDART_COMPANY_OVERVIEW",
                        "OpenDART 기업개황",
                        "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS001&apiId=2019002",
                        "OpenDART 기업개황 기준"
                    )
                )
            )
        ));
        stubCreateBasketPersistence(10L, 20L, 30L, 40L);

        service.createBasketJob(1L, new CreateBasketJobRequest(
            null,
            "네이버",
            positionTitle,
            "D-10",
            sourceUrl,
            "",
            "MANUAL"
        ));

        verify(mapper).updateCompanyClassification(10L, "navercorp.com", "대기업", "대기업");
        verify(mapper).upsertOfficialCompanyProfile(
            10L,
            "포털 및 기타 인터넷 정보매개 서비스업",
            "https://www.navercorp.com",
            "FINANCIAL_COMMISSION_COMPANY_BASIC",
            "00266961",
            "035420",
            "2208162520",
            "유가증권시장",
            "1999-06-02",
            "최수연",
            4123,
            "인터넷 검색 포털 운영",
            "경기도 성남시 분당구 정자일로 95"
        );
        verify(mapper).recordCompanyProfileSource(
            10L,
            "FINANCIAL_COMMISSION_COMPANY_BASIC",
            "금융위원회 기업기본정보",
            "https://www.data.go.kr/data/15043184/openapi.do",
            "공공데이터포털 금융위원회 기업기본정보 기준"
        );
        verify(mapper).recordCompanyProfileSource(
            10L,
            "OPENDART_COMPANY_OVERVIEW",
            "OpenDART 기업개황",
            "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS001&apiId=2019002",
            "OpenDART 기업개황 기준"
        );
    }

    @Test
    void listRecommendationJobsUsesSeededRecommendationRowsWithCompanyLogos() {
        JobRow line = recommendationRow(
            9001L,
            "LINE",
            "Server Platform Engineer",
            "D-7",
            "https://static.example.com/line-logo.png"
        );
        JobRow todayHouse = recommendationRow(
            9002L,
            "오늘의집",
            "Commerce Backend Developer",
            "D-10",
            "https://static.example.com/ohou-logo.png"
        );
        when(mapper.listRecommendationJobsBySource("RECOMMENDATION")).thenReturn(List.of(line, todayHouse));

        List<DashboardJobResponse> recommendations = service.listRecommendationJobs(1L);

        assertThat(recommendations)
            .extracting(
                DashboardJobResponse::basketJobId,
                DashboardJobResponse::companyName,
                DashboardJobResponse::companyLogoUrl,
                DashboardJobResponse::sourceUrl
            )
            .containsExactly(
                tuple(9001L, "LINE", "https://static.example.com/line-logo.png", "https://www.jasoseol.com/"),
                tuple(9002L, "오늘의집", "https://static.example.com/ohou-logo.png", "https://www.jasoseol.com/")
            );
    }

    @Test
    void saveRecommendationUsesTheSeededRecommendationRowAndLogo() {
        JobRow recommendation = recommendationRow(
            9001L,
            "LINE",
            "Server Platform Engineer",
            "D-7",
            "https://static.example.com/line-logo.png"
        );
        recommendation.setSourceUrl("https://www.jasoseol.com/recruit/line-platform");
        when(mapper.findRecommendationJobBySource(9001L, "RECOMMENDATION")).thenReturn(Optional.of(recommendation));
        when(mapper.findDuplicateBasketJob(
            1L,
            "LINE",
            "https://www.jasoseol.com/recruit/line-platform",
            "Server Platform Engineer"
        )).thenReturn(Optional.empty());
        stubCreateBasketPersistence(10L, 20L, 30L, 40L);

        service.saveRecommendation(1L, 9001L);

        verify(mapper).upsertCompany(argThat(row ->
            "LINE".equals(row.getCompanyName())
                && "line.me".equals(row.getCompanyDomain())
                && "대기업".equals(row.getCompanyType())
                && "https://static.example.com/line-logo.png".equals(row.getCompanyLogoUrl())
        ));
        verify(mapper).upsertOfficialCompanyProfile(
            10L,
            "IT/플랫폼",
            "https://line.me",
            "OFFICIAL_CLASSIFICATION",
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null
        );
    }

    @Test
    void saveMattermostRecommendationUsesMattermostSourceAndLogoInBasketFlow() {
        JobRow recommendation = recommendationRow(
            9101L,
            "한국교육학술정보원",
            "정보기술 서비스 기획",
            "04/27(월)",
            "https://www.google.com/s2/favicons?domain=keris.or.kr&sz=128"
        );
        recommendation.setSourceUrl("https://keris.recruiter.co.kr/app/jobnotice/view?jobnoticeSn=250774");
        when(mapper.findRecommendationJobBySource(9101L, "MATTERMOST")).thenReturn(Optional.of(recommendation));
        when(mapper.findDuplicateBasketJob(
            1L,
            "한국교육학술정보원",
            "https://keris.recruiter.co.kr/app/jobnotice/view?jobnoticeSn=250774",
            "정보기술 서비스 기획"
        )).thenReturn(Optional.empty());
        stubCreateBasketPersistence(11L, 21L, 31L, 41L);

        service.saveRecommendation(1L, 9101L, "mattermost");

        verify(mapper).upsertCompany(argThat(row ->
            "한국교육학술정보원".equals(row.getCompanyName())
                && "keris.or.kr".equals(row.getCompanyDomain())
                && "https://www.google.com/s2/favicons?domain=keris.or.kr&sz=128".equals(row.getCompanyLogoUrl())
        ));
        verify(mapper).insertBasketJob(argThat(row ->
            row.getUserId().equals(1L)
                && row.getJobId().equals(21L)
        ));
        verify(mapper).insertJob(argThat(row ->
            "MATTERMOST".equals(row.getSource())
                && "한국교육학술정보원".equals(row.getCompanyName())
                && "정보기술 서비스 기획".equals(row.getPositionTitle())
        ));
        verify(mapper).insertWorkspace(argThat(row ->
            row.getUserId().equals(1L)
                && row.getBasketJobId().equals(31L)
        ));
    }

    private void stubCreateBasketPersistence(Long companyId, Long jobId, Long basketJobId, Long workspaceId) {
        doAnswer(invocation -> {
            JobRow row = invocation.getArgument(0);
            row.setCompanyId(companyId);
            return null;
        }).when(mapper).upsertCompany(org.mockito.ArgumentMatchers.any());
        doAnswer(invocation -> {
            JobRow row = invocation.getArgument(0);
            row.setId(jobId);
            return null;
        }).when(mapper).insertJob(org.mockito.ArgumentMatchers.any());
        doAnswer(invocation -> {
            BasketJobRow row = invocation.getArgument(0);
            row.setId(basketJobId);
            return null;
        }).when(mapper).insertBasketJob(org.mockito.ArgumentMatchers.any());
        doAnswer(invocation -> {
            WorkspaceRow row = invocation.getArgument(0);
            row.setId(workspaceId);
            return null;
        }).when(mapper).insertWorkspace(org.mockito.ArgumentMatchers.any());
        doAnswer(invocation -> {
            EssayQuestionRow row = invocation.getArgument(0);
            row.setId(50L);
            return null;
        }).when(mapper).insertEssayQuestion(org.mockito.ArgumentMatchers.any());
    }

    private JobRow recommendationRow(
        Long id,
        String companyName,
        String positionTitle,
        String deadlineLabel,
        String logoUrl
    ) {
        JobRow row = new JobRow();
        row.setId(id);
        row.setCompanyName(companyName);
        row.setPositionTitle(positionTitle);
        row.setDeadlineLabel(deadlineLabel);
        row.setSourceUrl("https://www.jasoseol.com/");
        row.setCompanyLogoUrl(logoUrl);
        return row;
    }
}
