package com.ezone.backend.service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

final class DeadlineLabelRanker {

    private static final int UNKNOWN_DEADLINE_RANK = 9_999;
    private static final Pattern D_DAY_PATTERN = Pattern.compile("D-(\\d+)", Pattern.CASE_INSENSITIVE);
    private static final Pattern EXPLICIT_DATE_PATTERN = Pattern.compile("(20\\d{2})[-.](\\d{1,2})[-.](\\d{1,2})");
    private static final Pattern DAY_ONLY_PATTERN = Pattern.compile("(\\d{1,2})일");

    private DeadlineLabelRanker() {
    }

    static int rank(String deadlineLabel) {
        return rank(deadlineLabel, LocalDate.now());
    }

    static int rank(String deadlineLabel, LocalDate today) {
        if (deadlineLabel == null || deadlineLabel.isBlank()) {
            return UNKNOWN_DEADLINE_RANK;
        }

        if (deadlineLabel.contains("오늘")) {
            return 0;
        }

        Matcher dDay = D_DAY_PATTERN.matcher(deadlineLabel);
        if (dDay.find()) {
            return Integer.parseInt(dDay.group(1));
        }

        Matcher explicitDate = EXPLICIT_DATE_PATTERN.matcher(deadlineLabel);
        if (explicitDate.find()) {
            LocalDate deadline = LocalDate.of(
                Integer.parseInt(explicitDate.group(1)),
                Integer.parseInt(explicitDate.group(2)),
                Integer.parseInt(explicitDate.group(3))
            );
            return Math.toIntExact(ChronoUnit.DAYS.between(today, deadline));
        }

        Matcher dayOnly = DAY_ONLY_PATTERN.matcher(deadlineLabel);
        if (dayOnly.find()) {
            LocalDate deadline = LocalDate.of(today.getYear(), today.getMonth(), Integer.parseInt(dayOnly.group(1)));
            if (deadline.isBefore(today)) {
                deadline = deadline.plusMonths(1);
            }
            return Math.toIntExact(ChronoUnit.DAYS.between(today, deadline));
        }

        return UNKNOWN_DEADLINE_RANK;
    }
}
