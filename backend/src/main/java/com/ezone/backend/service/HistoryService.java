package com.ezone.backend.service;

import com.ezone.backend.domain.HistoryResultStage;
import com.ezone.backend.dto.history.HistoryApplicationResponse;

public interface HistoryService {
    HistoryApplicationResponse listApplications(Long userId, String period, HistoryResultStage resultStage);
}
