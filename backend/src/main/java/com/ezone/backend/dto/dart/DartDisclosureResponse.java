package com.ezone.backend.dto.dart;

public record DartDisclosureResponse(
    String rceptNo,
    String reportName,
    String reportType,
    String receivedDate,
    String corpName,
    boolean recommended,
    String sourceUrl
) {
}
