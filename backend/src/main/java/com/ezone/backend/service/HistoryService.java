package com.ezone.backend.service;

import com.ezone.backend.domain.HistoryResultStage;
import com.ezone.backend.dto.history.HistoryApplicationResponse;
import com.ezone.backend.dto.history.HistoryApplicationResponse.HistoryApplicationRowResponse;
import com.ezone.backend.dto.history.UpdateHistoryApplicationLabelsRequest;

public interface HistoryService {
    HistoryApplicationResponse listApplications(Long userId, String period, HistoryResultStage resultStage);

    HistoryApplicationRowResponse updateApplicationLabels(
        Long userId,
        Long historyApplicationId,
        UpdateHistoryApplicationLabelsRequest request
    );
}
