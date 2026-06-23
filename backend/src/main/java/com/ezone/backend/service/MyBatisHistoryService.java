package com.ezone.backend.service;

import com.ezone.backend.domain.HistoryResultStage;
import com.ezone.backend.domain.persistence.HistoryApplicationRow;
import com.ezone.backend.dto.history.HistoryApplicationResponse;
import com.ezone.backend.dto.history.HistoryApplicationResponse.HistoryApplicationRowResponse;
import com.ezone.backend.dto.history.UpdateHistoryApplicationLabelsRequest;
import com.ezone.backend.mapper.HistoryMapper;
import com.ezone.backend.mapper.P1WorkspaceMapper;
import java.util.Objects;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Profile("mysql")
public class MyBatisHistoryService implements HistoryService {
    private static final long ACTIVE_BASKET_HISTORY_ID_OFFSET = 1_000_000_000L;

    private final HistoryMapper mapper;
    private final P1WorkspaceMapper workspaceMapper;

    public MyBatisHistoryService(HistoryMapper mapper, P1WorkspaceMapper workspaceMapper) {
        this.mapper = mapper;
        this.workspaceMapper = workspaceMapper;
    }

    @Override
    public HistoryApplicationResponse listApplications(Long userId, String period, HistoryResultStage resultStage) {
        return HistoryApplicationAssembler.toResponse(mapper.listApplications(userId), period, resultStage);
    }

    @Override
    @Transactional
    public HistoryApplicationRowResponse updateApplicationLabels(
        Long userId,
        Long historyApplicationId,
        UpdateHistoryApplicationLabelsRequest request
    ) {
        requireValidRequest(request);
        HistoryApplicationRow currentRow = findCurrentRow(userId, historyApplicationId);
        String resultLabel = resultLabel(request.resultStage());
        if (historyApplicationId >= ACTIVE_BASKET_HISTORY_ID_OFFSET) {
            Long basketJobId = historyApplicationId - ACTIVE_BASKET_HISTORY_ID_OFFSET;
            workspaceMapper.upsertApplicationHistoryFromBasketJob(userId, basketJobId);
            if (mapper.updateApplicationLabelsByWorkspaceId(
                userId,
                currentRow.getWorkspaceId(),
                request.applicationStatus(),
                request.resultStage(),
                resultLabel
            ) == 0) {
                throw new IllegalArgumentException("History application not found");
            }
        } else if (mapper.updateApplicationLabels(
            userId,
            historyApplicationId,
            request.applicationStatus(),
            request.resultStage(),
            resultLabel
        ) == 0) {
            throw new IllegalArgumentException("History application not found");
        }
        return HistoryApplicationAssembler.rowResponse(findUpdatedRow(userId, currentRow.getWorkspaceId()));
    }

    private HistoryApplicationRow findCurrentRow(Long userId, Long historyApplicationId) {
        return mapper.listApplications(userId).stream()
            .filter(row -> Objects.equals(row.getId(), historyApplicationId))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("History application not found"));
    }

    private HistoryApplicationRow findUpdatedRow(Long userId, Long workspaceId) {
        return mapper.listApplications(userId).stream()
            .filter(row -> Objects.equals(row.getWorkspaceId(), workspaceId))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("History application not found"));
    }

    private static void requireValidRequest(UpdateHistoryApplicationLabelsRequest request) {
        if (request == null || request.applicationStatus() == null || request.resultStage() == null) {
            throw new IllegalArgumentException("History labels are required");
        }
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
}
