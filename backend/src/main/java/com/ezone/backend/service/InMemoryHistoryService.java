package com.ezone.backend.service;

import com.ezone.backend.domain.ApplicationStatus;
import com.ezone.backend.domain.HistoryResultStage;
import com.ezone.backend.domain.persistence.HistoryApplicationRow;
import com.ezone.backend.dto.history.HistoryApplicationResponse;
import java.util.ArrayList;
import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

@Service
@Profile("!mysql")
public class InMemoryHistoryService implements HistoryService {

    private final List<HistoryApplicationRow> rows = new ArrayList<>();

    public InMemoryHistoryService() {
        rows.add(row(1L, 102L, "Dalpha", "AI Engineer", "2025.03.23", "2025-H1", 2025, "H1",
            HistoryResultStage.DOCUMENT_FAILED, "Document stage ended", "Document failed", "Startup"));
        rows.add(row(2L, 103L, "Nexon Korea", "Data Analyst", "No deadline", "2025-H1", 2025, "H1",
            HistoryResultStage.NOT_APPLIED, "Not applied", "Not applied", "Enterprise"));
    }

    @Override
    public HistoryApplicationResponse listApplications(Long userId, String period, HistoryResultStage resultStage) {
        return HistoryApplicationAssembler.toResponse(rows, period, resultStage);
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
        row.setApplicationStatus(resultStage == HistoryResultStage.IN_PROGRESS ? ApplicationStatus.IN_PROGRESS : ApplicationStatus.NOT_APPLIED);
        row.setResultStage(resultStage);
        row.setResultLabel(resultLabel);
        row.setRawResult(rawResult);
        row.setDeadlineLabel(deadlineLabel);
        row.setPeriodKey(periodKey);
        row.setPeriodYear(year);
        row.setPeriodHalf(half);
        row.setSourceUrl("https://example.com/history/%d".formatted(id));
        row.setCompanyType(companyType);
        return row;
    }
}
