package com.ezone.backend.dto.workspace;

import java.math.BigDecimal;

public record CompanyDetailsResponse(
    String domain,
    String companyType,
    String size,
    String logoUrl,
    BigDecimal rating,
    Integer startingSalary,
    String financialStatus,
    String industry,
    Integer employeeCount,
    String foundedAt,
    Long capital,
    Long revenue,
    String representative,
    String homepage,
    String business,
    String address
) {
}
