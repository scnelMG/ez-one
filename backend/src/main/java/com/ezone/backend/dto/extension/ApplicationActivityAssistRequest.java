package com.ezone.backend.dto.extension;

import java.util.List;

public record ApplicationActivityAssistRequest(
    String companyName,
    String positionTitle,
    Integer maxItems,
    Integer detailLimit,
    String detailLimitUnit,
    String pageContext,
    List<String> fieldLabels
) {
}
