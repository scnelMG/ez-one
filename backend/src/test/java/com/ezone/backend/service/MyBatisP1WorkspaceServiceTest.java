package com.ezone.backend.service;

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

    @InjectMocks
    private MyBatisP1WorkspaceService service;

    @Test
    void createBasketJobRecordsUnverifiedCompanyInfoSourceFromSavedUrl() {
        String sourceUrl = "https://careers.example.com/jobs/backend";
        when(mapper.findDuplicateBasketJob(1L, sourceUrl, "Backend Developer")).thenReturn(Optional.empty());
        doAnswer(invocation -> {
            JobRow row = invocation.getArgument(0);
            row.setCompanyId(10L);
            return null;
        }).when(mapper).upsertCompany(org.mockito.ArgumentMatchers.any());
        doAnswer(invocation -> {
            JobRow row = invocation.getArgument(0);
            row.setId(20L);
            return null;
        }).when(mapper).insertJob(org.mockito.ArgumentMatchers.any());
        doAnswer(invocation -> {
            BasketJobRow row = invocation.getArgument(0);
            row.setId(30L);
            return null;
        }).when(mapper).insertBasketJob(org.mockito.ArgumentMatchers.any());
        doAnswer(invocation -> {
            WorkspaceRow row = invocation.getArgument(0);
            row.setId(40L);
            return null;
        }).when(mapper).insertWorkspace(org.mockito.ArgumentMatchers.any());
        doAnswer(invocation -> {
            EssayQuestionRow row = invocation.getArgument(0);
            row.setId(50L);
            return null;
        }).when(mapper).insertEssayQuestion(org.mockito.ArgumentMatchers.any());

        service.createBasketJob(1L, new CreateBasketJobRequest(
            "Example Labs",
            "Backend Developer",
            "D-5",
            sourceUrl,
            "https://static.example.com/example-logo.png",
            "DIRECT"
        ));

        verify(mapper).upsertCompany(argThat(row ->
            "https://static.example.com/example-logo.png".equals(row.getCompanyLogoUrl())
                && sourceUrl.equals(row.getLogoSourceUrl())
                && "DISCOVERED".equals(row.getLogoStatus())
        ));
        verify(mapper).recordCompanyInfoSource(10L, "SAVED_JOB_URL", sourceUrl, "UNVERIFIED");
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
        when(mapper.listRecommendationJobs()).thenReturn(List.of(line, todayHouse));

        List<DashboardJobResponse> recommendations = service.listRecommendationJobs(1L);

        org.assertj.core.api.Assertions.assertThat(recommendations)
            .extracting(
                DashboardJobResponse::basketJobId,
                DashboardJobResponse::companyName,
                DashboardJobResponse::companyLogoUrl
            )
            .containsExactly(
                org.assertj.core.groups.Tuple.tuple(9001L, "LINE", "https://static.example.com/line-logo.png"),
                org.assertj.core.groups.Tuple.tuple(9002L, "오늘의집", "https://static.example.com/ohou-logo.png")
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
        when(mapper.findRecommendationJob(9001L)).thenReturn(Optional.of(recommendation));
        when(mapper.findDuplicateBasketJob(
            1L,
            "https://www.jasoseol.com/recruit/line-platform",
            "Server Platform Engineer"
        )).thenReturn(Optional.empty());
        doAnswer(invocation -> {
            JobRow row = invocation.getArgument(0);
            row.setCompanyId(10L);
            return null;
        }).when(mapper).upsertCompany(org.mockito.ArgumentMatchers.any());
        doAnswer(invocation -> {
            JobRow row = invocation.getArgument(0);
            row.setId(20L);
            return null;
        }).when(mapper).insertJob(org.mockito.ArgumentMatchers.any());
        doAnswer(invocation -> {
            BasketJobRow row = invocation.getArgument(0);
            row.setId(30L);
            return null;
        }).when(mapper).insertBasketJob(org.mockito.ArgumentMatchers.any());
        doAnswer(invocation -> {
            WorkspaceRow row = invocation.getArgument(0);
            row.setId(40L);
            return null;
        }).when(mapper).insertWorkspace(org.mockito.ArgumentMatchers.any());
        doAnswer(invocation -> {
            EssayQuestionRow row = invocation.getArgument(0);
            row.setId(50L);
            return null;
        }).when(mapper).insertEssayQuestion(org.mockito.ArgumentMatchers.any());

        service.saveRecommendation(1L, 9001L);

        verify(mapper).upsertCompany(argThat(row ->
            "LINE".equals(row.getCompanyName())
                && "https://static.example.com/line-logo.png".equals(row.getCompanyLogoUrl())
        ));
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
