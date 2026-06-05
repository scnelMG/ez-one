package com.ezone.backend.dto.workspace;

import java.math.BigDecimal;

public record CompanyDetailsResponse(
    String domain,
    String companyType,
    String size,
    BigDecimal rating,
    Integer startingSalary,
    String financialStatus
) {
}
