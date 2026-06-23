package com.ezone.backend.service;

import com.ezone.backend.domain.ApplicationStatus;
import com.ezone.backend.domain.HistoryResultStage;
import com.ezone.backend.domain.persistence.HistoryApplicationRow;
import com.ezone.backend.dto.history.HistoryApplicationResponse;
import com.ezone.backend.dto.history.HistoryApplicationResponse.HistoryApplicationRowResponse;
import com.ezone.backend.dto.history.HistoryApplicationResponse.HistoryCompanyTypeResponse;
import com.ezone.backend.dto.history.HistoryApplicationResponse.HistoryDataQualityResponse;
import com.ezone.backend.dto.history.HistoryApplicationResponse.HistoryIndustryResponse;
import com.ezone.backend.dto.history.HistoryApplicationResponse.HistoryPeriodResponse;
import com.ezone.backend.dto.history.HistoryApplicationResponse.HistorySummaryResponse;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

final class HistoryApplicationAssembler {
    private static final String UNKNOWN = "미확인";
    private static final String DATA_SOURCE_MASTER = "MASTER";
    private static final String DATA_SOURCE_RULE = "RULE";
    private static final String DATA_SOURCE_UNKNOWN = "UNKNOWN";

    private HistoryApplicationAssembler() {
    }

    static HistoryApplicationResponse toResponse(List<HistoryApplicationRow> allRows, String period, HistoryResultStage resultStage) {
        List<HistoryApplicationRow> periodRows = allRows.stream()
            .filter(row -> isAllPeriod(period) || period.equals(row.getPeriodKey()))
            .toList();
        List<HistoryApplicationRow> filteredRows = periodRows.stream()
            .filter(row -> resultStage == null || row.getResultStage() == resultStage)
            .toList();

        return new HistoryApplicationResponse(
            periods(allRows),
            summary(periodRows),
            companyTypes(periodRows),
            industryStats(periodRows),
            dataQuality(periodRows),
            filteredRows.stream().map(HistoryApplicationAssembler::rowResponse).toList()
        );
    }

    private static boolean isAllPeriod(String period) {
        return period == null || period.isBlank() || "ALL".equalsIgnoreCase(period);
    }

    private static List<HistoryPeriodResponse> periods(List<HistoryApplicationRow> rows) {
        List<HistoryPeriodResponse> periodOptions = rows.stream()
            .filter(row -> row.getPeriodKey() != null && !row.getPeriodKey().isBlank())
            .collect(Collectors.toMap(
                HistoryApplicationRow::getPeriodKey,
                row -> new HistoryPeriodResponse(row.getPeriodKey(), periodLabel(row.getPeriodYear(), row.getPeriodHalf())),
                (left, ignored) -> left
            ))
            .values()
            .stream()
            .sorted(Comparator
                .comparingInt((HistoryPeriodResponse period) -> periodSortRank(period.value()))
                .reversed()
                .thenComparing(HistoryPeriodResponse::label))
            .toList();
        return Stream.concat(
            Stream.of(new HistoryPeriodResponse("ALL", "전체")),
            periodOptions.stream()
        ).toList();
    }

    private static HistorySummaryResponse summary(List<HistoryApplicationRow> rows) {
        Map<HistoryResultStage, Long> resultCounts = rows.stream()
            .collect(Collectors.groupingBy(HistoryApplicationRow::getResultStage, Collectors.counting()));
        Map<ApplicationStatus, Long> statusCounts = rows.stream()
            .collect(Collectors.groupingBy(HistoryApplicationRow::getApplicationStatus, Collectors.counting()));
        return new HistorySummaryResponse(
            rows.size(),
            statusCounts.getOrDefault(ApplicationStatus.COMPLETED, 0L),
            statusCounts.getOrDefault(ApplicationStatus.NOT_APPLIED, 0L),
            statusCounts.getOrDefault(ApplicationStatus.IN_PROGRESS, 0L),
            statusCounts.getOrDefault(ApplicationStatus.READY, 0L),
            resultCounts.getOrDefault(HistoryResultStage.DOCUMENT_FAILED, 0L),
            resultCounts.getOrDefault(HistoryResultStage.TEST_FAILED, 0L),
            resultCounts.getOrDefault(HistoryResultStage.INTERVIEW_FAILED, 0L)
        );
    }

    private static List<HistoryCompanyTypeResponse> companyTypes(List<HistoryApplicationRow> rows) {
        return rows.stream()
            .map(row -> valueOrUnknown(row.getCompanyType()))
            .collect(Collectors.groupingBy(Function.identity(), Collectors.counting()))
            .entrySet()
            .stream()
            .sorted(Map.Entry.<String, Long>comparingByValue().reversed().thenComparing(Map.Entry.comparingByKey()))
            .map(entry -> new HistoryCompanyTypeResponse(entry.getKey(), entry.getValue()))
            .toList();
    }

    private static List<HistoryIndustryResponse> industryStats(List<HistoryApplicationRow> rows) {
        return rows.stream()
            .map(row -> valueOrUnknown(row.getCompanyIndustry()))
            .collect(Collectors.groupingBy(Function.identity(), Collectors.counting()))
            .entrySet()
            .stream()
            .sorted(Map.Entry.<String, Long>comparingByValue().reversed().thenComparing(Map.Entry.comparingByKey()))
            .map(entry -> new HistoryIndustryResponse(entry.getKey(), entry.getValue()))
            .toList();
    }

    private static HistoryDataQualityResponse dataQuality(List<HistoryApplicationRow> rows) {
        long companyMaster = rows.stream().filter(row -> DATA_SOURCE_MASTER.equals(normalizedDataSource(row))).count();
        long ruleBased = rows.stream().filter(row -> DATA_SOURCE_RULE.equals(normalizedDataSource(row))).count();
        long unknown = rows.size() - companyMaster - ruleBased;
        return new HistoryDataQualityResponse(rows.size(), companyMaster, ruleBased, unknown);
    }

    static HistoryApplicationRowResponse rowResponse(HistoryApplicationRow row) {
        return new HistoryApplicationRowResponse(
            row.getId(),
            row.getWorkspaceId(),
            row.getCompanyName(),
            row.getPositionTitle(),
            row.getApplicationStatus(),
            row.getResultStage(),
            row.getResultLabel(),
            row.getRawResult(),
            row.getDeadlineLabel(),
            row.getSourceUrl(),
            row.getCompanyLogoUrl(),
            valueOrUnknown(row.getCompanyType()),
            valueOrUnknown(row.getCompanyIndustry()),
            normalizedDataSource(row)
        );
    }

    private static String valueOrUnknown(String value) {
        return value == null || value.isBlank() ? UNKNOWN : value;
    }

    private static String normalizedDataSource(HistoryApplicationRow row) {
        String value = row.getCompanyDataSource();
        if (DATA_SOURCE_MASTER.equals(value) || DATA_SOURCE_RULE.equals(value)) {
            return value;
        }
        return DATA_SOURCE_UNKNOWN;
    }

    private static String periodLabel(Integer year, String half) {
        if (year == null) {
            return "기간 미기록";
        }
        return "%d %s".formatted(year, "H2".equals(half) ? "하반기" : "상반기");
    }

    private static int periodSortRank(String value) {
        if (value == null || !value.matches("\\d{4}-H[12]")) {
            return Integer.MIN_VALUE;
        }
        int year = Integer.parseInt(value.substring(0, 4));
        int half = "H2".equals(value.substring(5)) ? 2 : 1;
        return year * 10 + half;
    }
}
