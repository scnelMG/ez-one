package com.ezone.backend.dto.company;

public record CompanySearchResponse(
    Long id,
    String name,
    String domain,
    String logoUrl
) {}
