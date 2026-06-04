package com.ezone.backend.dto.dashboard;

import java.util.List;

public record DashboardSummaryResponse(
    long totalApplications,
    long inProgress,
    long notStarted,
    long deadlineSoon,
    List<DashboardJobResponse> todayJobs
) {
}
