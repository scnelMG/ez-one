package com.ezone.backend.dto.history;

import com.ezone.backend.domain.ApplicationStatus;
import com.ezone.backend.domain.HistoryResultStage;
import java.util.List;

public record HistoryApplicationResponse(
    List<HistoryPeriodResponse> periods,
    HistorySummaryResponse summary,
    List<HistoryCompanyTypeResponse> companyTypes,
    List<HistoryIndustryResponse> industryStats,
    HistoryDataQualityResponse dataQuality,
    List<HistoryApplicationRowResponse> rows
) {
    public record HistoryPeriodResponse(String value, String label) {
    }

    public record HistorySummaryResponse(
        long total,
        long completed,
        long notApplied,
        long inProgress,
        long ready,
        long documentFailed,
        long testFailed,
        long interviewFailed
    ) {
    }

    public record HistoryCompanyTypeResponse(String type, long count) {
    }

    public record HistoryIndustryResponse(String industry, long count) {
    }

    public record HistoryDataQualityResponse(long total, long companyMaster, long ruleBased, long unknown) {
    }

    public record HistoryApplicationRowResponse(
        Long id,
        Long workspaceId,
        String companyName,
        String positionTitle,
        ApplicationStatus applicationStatus,
        HistoryResultStage resultStage,
        String resultLabel,
        String rawResult,
        String deadlineLabel,
        String sourceUrl,
        String companyLogoUrl,
        String companyType,
        String companyIndustry,
        String companyDataSource
    ) {
    }
}
