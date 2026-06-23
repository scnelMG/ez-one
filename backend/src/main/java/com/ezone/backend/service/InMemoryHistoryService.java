package com.ezone.backend.service;

import com.ezone.backend.domain.ApplicationStatus;
import com.ezone.backend.domain.HistoryResultStage;
import com.ezone.backend.domain.persistence.HistoryApplicationRow;
import com.ezone.backend.dto.history.HistoryApplicationResponse;
import com.ezone.backend.dto.history.HistoryApplicationResponse.HistoryApplicationRowResponse;
import com.ezone.backend.dto.history.UpdateHistoryApplicationLabelsRequest;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

@Service
@Profile("!mysql")
public class InMemoryHistoryService implements HistoryService {

    private final List<HistoryApplicationRow> rows = new ArrayList<>();
    private final AtomicLong idGenerator = new AtomicLong(1000);

    public InMemoryHistoryService() {
        rows.add(row(1L, 102L, "달파", "AI Engineer", "2025.03.23", "2025-H1", 2025, "H1",
            HistoryResultStage.DOCUMENT_FAILED, "서류 단계 종료", "서류탈락", "스타트업"));
        rows.add(row(2L, 103L, "넥슨코리아", "데이터 분석가", "마감일 미기록", "2025-H1", 2025, "H1",
            HistoryResultStage.NOT_APPLIED, "미지원", "미지원", "대기업"));
        rows.add(row(3L, 104L, "한국전력공사", "데이터 엔지니어", "2026.02.01", "2026-H1", 2026, "H1",
            HistoryResultStage.IN_PROGRESS, "진행 중", "면접 대기", "공공기관"));
    }

    @Override
    public HistoryApplicationResponse listApplications(Long userId, String period, HistoryResultStage resultStage) {
        return HistoryApplicationAssembler.toResponse(rows.stream()
            .filter(row -> row.getUserId().equals(userId))
            .toList(), period, resultStage);
    }

    @Override
    public HistoryApplicationRowResponse updateApplicationLabels(
        Long userId,
        Long historyApplicationId,
        UpdateHistoryApplicationLabelsRequest request
    ) {
        if (request == null || request.applicationStatus() == null || request.resultStage() == null) {
            throw new IllegalArgumentException("History labels are required");
        }
        HistoryApplicationRow row = rows.stream()
            .filter(candidate -> Objects.equals(candidate.getUserId(), userId))
            .filter(candidate -> Objects.equals(candidate.getId(), historyApplicationId))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("History application not found"));
        String resultLabel = resultLabel(request.resultStage());
        row.setApplicationStatus(request.applicationStatus());
        row.setResultStage(request.resultStage());
        row.setResultLabel(resultLabel);
        row.setRawResult(resultLabel);
        return HistoryApplicationAssembler.rowResponse(row);
    }

    public void recordArchivedBasketJob(
        Long userId,
        Long workspaceId,
        String companyName,
        String positionTitle,
        ApplicationStatus applicationStatus,
        String deadlineLabel,
        String sourceUrl
    ) {
        if (rows.stream().anyMatch(row -> row.getWorkspaceId().equals(workspaceId))) {
            return;
        }
        String periodKey = "2026-H1";
        HistoryResultStage resultStage = applicationStatus == ApplicationStatus.NOT_APPLIED || applicationStatus == ApplicationStatus.READY
            ? HistoryResultStage.NOT_APPLIED
            : HistoryResultStage.IN_PROGRESS;
        CompanyDetailDefaults.CompanyDefaults defaults = CompanyDetailDefaults.resolve(companyName, sourceUrl);
        HistoryApplicationRow row = row(
            idGenerator.incrementAndGet(),
            workspaceId,
            companyName,
            positionTitle,
            deadlineLabel,
            periodKey,
            2026,
            "H1",
            resultStage,
            resultLabel(applicationStatus),
            resultLabel(applicationStatus),
            defaults.companyType()
        );
        row.setUserId(userId);
        row.setSourceUrl(sourceUrl);
        row.setApplicationStatus(applicationStatus);
        row.setCompanyIndustry(defaults.industry());
        row.setCompanyDataSource(CompanyDetailDefaults.UNKNOWN_DOMAIN.equals(defaults.domain()) ? "UNKNOWN" : "RULE");
        rows.add(row);
    }

    private static HistoryApplicationRow row(
        Long id,
        Long workspaceId,
        String companyName,
        String positionTitle,
        String deadlineLabel,
        String periodKey,
        int year,
        String half,
        HistoryResultStage resultStage,
        String resultLabel,
        String rawResult,
        String companyType
    ) {
        HistoryApplicationRow row = new HistoryApplicationRow();
        row.setId(id);
        row.setUserId(1L);
        row.setWorkspaceId(workspaceId);
        row.setCompanyName(companyName);
        row.setPositionTitle(positionTitle);
        row.setApplicationStatus(applicationStatus(resultStage));
        row.setResultStage(resultStage);
        row.setResultLabel(resultLabel);
        row.setRawResult(rawResult);
        row.setDeadlineLabel(deadlineLabel);
        row.setPeriodKey(periodKey);
        row.setPeriodYear(year);
        row.setPeriodHalf(half);
        row.setSourceUrl("https://example.com/history/%d".formatted(id));
        row.setCompanyType(companyType);
        row.setCompanyIndustry(CompanyDetailDefaults.UNKNOWN_KO);
        row.setCompanyDataSource(CompanyDetailDefaults.UNKNOWN_KO.equals(companyType) ? "UNKNOWN" : "RULE");
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

    private static String resultLabel(HistoryResultStage resultStage) {
        return switch (resultStage) {
            case DOCUMENT_FAILED -> "서류 탈락";
            case TEST_FAILED -> "인적성/과제 탈락";
            case INTERVIEW_FAILED -> "면접 탈락";
            case NOT_APPLIED -> "미지원";
            case IN_PROGRESS -> "진행 중";
        };
    }

    private static String resultLabel(ApplicationStatus status) {
        return switch (status) {
            case READY -> "지원 전";
            case NOT_APPLIED -> "미지원";
            case IN_PROGRESS -> "진행 중";
            case COMPLETED -> "지원완료";
        };
    }
}
