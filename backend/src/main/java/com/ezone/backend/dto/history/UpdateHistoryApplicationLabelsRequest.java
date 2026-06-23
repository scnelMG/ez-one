package com.ezone.backend.dto.history;

import com.ezone.backend.domain.ApplicationStatus;
import com.ezone.backend.domain.HistoryResultStage;

public record UpdateHistoryApplicationLabelsRequest(
    ApplicationStatus applicationStatus,
    HistoryResultStage resultStage
) {
}
