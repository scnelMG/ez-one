package com.ezone.backend.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.ezone.backend.domain.ApplicationStatus;
import com.ezone.backend.domain.HistoryResultStage;
import com.ezone.backend.domain.persistence.HistoryApplicationRow;
import com.ezone.backend.dto.history.HistoryApplicationResponse;
import java.util.List;
import org.junit.jupiter.api.Test;

class HistoryApplicationAssemblerTest {

    @Test
    void periodOptionsShowNewestHalfYearFirstAndUnknownLast() {
        HistoryApplicationResponse response = HistoryApplicationAssembler.toResponse(List.of(
            row(1L, "기간 미기록 회사", "UNKNOWN", null, "UNKNOWN"),
            row(2L, "2025 상반기 회사", "2025-H1", 2025, "H1"),
            row(3L, "2026 상반기 회사", "2026-H1", 2026, "H1"),
            row(4L, "2025 하반기 회사", "2025-H2", 2025, "H2")
        ), "ALL", null);

        assertThat(response.periods())
            .extracting(HistoryApplicationResponse.HistoryPeriodResponse::label)
            .containsExactly("전체", "2026 상반기", "2025 하반기", "2025 상반기", "기간 미기록");
    }

    @Test
    void resultFilteringPreservesMapperOrdering() {
        HistoryApplicationResponse response = HistoryApplicationAssembler.toResponse(List.of(
            row(3L, "먼저 보여야 하는 회사", "2026-H1", 2026, "H1"),
            row(1L, "나중 회사", "2025-H2", 2025, "H2"),
            row(2L, "다른 결과 회사", "2025-H1", 2025, "H1", HistoryResultStage.NOT_APPLIED)
        ), "ALL", HistoryResultStage.DOCUMENT_FAILED);

        assertThat(response.rows())
            .extracting(HistoryApplicationResponse.HistoryApplicationRowResponse::companyName)
            .containsExactly("먼저 보여야 하는 회사", "나중 회사");
    }

    @Test
    void summaryUsesStandardFourApplicationStatuses() {
        HistoryApplicationResponse response = HistoryApplicationAssembler.toResponse(List.of(
            row(1L, "지원완료 회사", "2026-H1", 2026, "H1", ApplicationStatus.COMPLETED, HistoryResultStage.IN_PROGRESS, "대기업", "IT", "RULE"),
            row(2L, "미지원 회사", "2026-H1", 2026, "H1", ApplicationStatus.NOT_APPLIED, HistoryResultStage.NOT_APPLIED, "기타", "미확인", "UNKNOWN"),
            row(3L, "진행중 회사", "2026-H1", 2026, "H1", ApplicationStatus.IN_PROGRESS, HistoryResultStage.IN_PROGRESS, "스타트업", "플랫폼", "RULE"),
            row(4L, "지원전 회사", "2026-H1", 2026, "H1", ApplicationStatus.READY, HistoryResultStage.IN_PROGRESS, "중소기업", "제조", "RULE")
        ), "ALL", null);

        assertThat(response.summary().completed()).isEqualTo(1);
        assertThat(response.summary().notApplied()).isEqualTo(1);
        assertThat(response.summary().inProgress()).isEqualTo(1);
        assertThat(response.summary().ready()).isEqualTo(1);
    }

    @Test
    void companyDashboardUsesMasterBackedLabelsIndustryAndQuality() {
        HistoryApplicationResponse response = HistoryApplicationAssembler.toResponse(List.of(
            row(1L, "KB국민은행", "2026-H1", 2026, "H1", ApplicationStatus.COMPLETED, HistoryResultStage.IN_PROGRESS, "금융권", "금융", "MASTER"),
            row(2L, "카카오뱅크", "2026-H1", 2026, "H1", ApplicationStatus.IN_PROGRESS, HistoryResultStage.IN_PROGRESS, "대기업", "금융", "RULE"),
            row(3L, "알수없는회사", "2026-H1", 2026, "H1", ApplicationStatus.NOT_APPLIED, HistoryResultStage.NOT_APPLIED, "", "", null)
        ), "ALL", null);

        assertThat(response.companyTypes())
            .extracting(HistoryApplicationResponse.HistoryCompanyTypeResponse::type)
            .contains("금융권", "대기업", "미확인");
        assertThat(response.industryStats())
            .extracting(HistoryApplicationResponse.HistoryIndustryResponse::industry)
            .contains("금융", "미확인");
        assertThat(response.dataQuality().total()).isEqualTo(3);
        assertThat(response.dataQuality().companyMaster()).isEqualTo(1);
        assertThat(response.dataQuality().ruleBased()).isEqualTo(1);
        assertThat(response.dataQuality().unknown()).isEqualTo(1);
        assertThat(response.rows().get(0).companyIndustry()).isEqualTo("금융");
        assertThat(response.rows().get(0).companyDataSource()).isEqualTo("MASTER");
        assertThat(response.rows().get(2).companyType()).isEqualTo("미확인");
    }

    private static HistoryApplicationRow row(Long id, String companyName, String periodKey, Integer year, String half) {
        return row(id, companyName, periodKey, year, half, HistoryResultStage.DOCUMENT_FAILED);
    }

    private static HistoryApplicationRow row(
        Long id,
        String companyName,
        String periodKey,
        Integer year,
        String half,
        HistoryResultStage resultStage
    ) {
        return row(
            id,
            companyName,
            periodKey,
            year,
            half,
            applicationStatus(resultStage),
            resultStage,
            "기타",
            "미확인",
            "UNKNOWN"
        );
    }

    private static HistoryApplicationRow row(
        Long id,
        String companyName,
        String periodKey,
        Integer year,
        String half,
        ApplicationStatus applicationStatus,
        HistoryResultStage resultStage,
        String companyType,
        String industry,
        String dataSource
    ) {
        HistoryApplicationRow row = new HistoryApplicationRow();
        row.setId(id);
        row.setUserId(1L);
        row.setWorkspaceId(id + 100);
        row.setCompanyName(companyName);
        row.setPositionTitle("데이터 분석가");
        row.setApplicationStatus(applicationStatus);
        row.setResultStage(resultStage);
        row.setResultLabel("서류 단계 종료");
        row.setRawResult("서류탈락");
        row.setDeadlineLabel("2026년 1월 1일");
        row.setPeriodKey(periodKey);
        row.setPeriodYear(year);
        row.setPeriodHalf(half);
        row.setSourceUrl("https://example.com/" + id);
        row.setCompanyType(companyType);
        row.setCompanyIndustry(industry);
        row.setCompanyDataSource(dataSource);
        return row;
    }

    private static ApplicationStatus applicationStatus(HistoryResultStage resultStage) {
        if (resultStage == HistoryResultStage.IN_PROGRESS) {
            return ApplicationStatus.IN_PROGRESS;
        }
        if (resultStage == HistoryResultStage.NOT_APPLIED) {
            return ApplicationStatus.NOT_APPLIED;
        }
        return ApplicationStatus.COMPLETED;
    }
}
