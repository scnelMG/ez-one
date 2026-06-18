package com.ezone.backend.service;

public record RealtimeCompanyEnrichment(
    String domain,
    String companyType,
    String size,
    String industry,
    String homepageUrl,
    String foundedAt,
    String representative,
    String businessSummary,
    String address,
    String sourceType,
    String sourceName,
    String sourceUrl,
    String sourceNote
) {
}
