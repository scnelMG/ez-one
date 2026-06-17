package com.ezone.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.groups.Tuple.tuple;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.doAnswer;
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
        verify(mapper).upsertRuleBasedCompanyProfile(10L, "금융", "kakaobank.com");
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
        verify(mapper).upsertRuleBasedCompanyProfile(10L, "IT/플랫폼", "line.me");
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
