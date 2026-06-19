package com.ezone.backend.service;

import java.util.ArrayList;
import java.util.List;
import org.springframework.util.StringUtils;

public record RealtimeCompanyEnrichment(
    String domain,
    String companyType,
    String size,
    String industry,
    String companyCategory,
    String corpCode,
    String stockCode,
    String businessNumber,
    String homepageUrl,
    String foundedAt,
    String representative,
    Integer employeeCount,
    String businessSummary,
    String address,
    String sourceType,
    String sourceName,
    String sourceUrl,
    String sourceNote,
    List<Source> sources
) {
    public RealtimeCompanyEnrichment(
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
        this(
            domain,
            companyType,
            size,
            industry,
            null,
            null,
            null,
            null,
            homepageUrl,
            foundedAt,
            representative,
            null,
            businessSummary,
            address,
            sourceType,
            sourceName,
            sourceUrl,
            sourceNote,
            List.of(new Source(sourceType, sourceName, sourceUrl, sourceNote))
        );
    }

    public RealtimeCompanyEnrichment {
        sources = sources == null || sources.isEmpty()
            ? List.of(new Source(sourceType, sourceName, sourceUrl, sourceNote))
            : List.copyOf(sources);
    }

    public RealtimeCompanyEnrichment mergeMissing(RealtimeCompanyEnrichment fallback) {
        if (fallback == null) {
            return this;
        }
        List<Source> mergedSources = new ArrayList<>(sources);
        fallback.sources().forEach(source -> {
            if (!mergedSources.contains(source)) {
                mergedSources.add(source);
            }
        });
        return new RealtimeCompanyEnrichment(
            firstText(domain, fallback.domain()),
            firstText(companyType, fallback.companyType()),
            firstText(size, fallback.size()),
            firstText(industry, fallback.industry()),
            firstText(companyCategory, fallback.companyCategory()),
            firstText(corpCode, fallback.corpCode()),
            firstText(stockCode, fallback.stockCode()),
            firstText(businessNumber, fallback.businessNumber()),
            firstText(homepageUrl, fallback.homepageUrl()),
            firstText(foundedAt, fallback.foundedAt()),
            firstText(representative, fallback.representative()),
            employeeCount != null ? employeeCount : fallback.employeeCount(),
            firstText(businessSummary, fallback.businessSummary()),
            firstText(address, fallback.address()),
            sourceType,
            sourceName,
            sourceUrl,
            sourceNote,
            mergedSources
        );
    }

    private static String firstText(String primary, String fallback) {
        return StringUtils.hasText(primary) ? primary : fallback;
    }

    public record Source(
        String sourceType,
        String sourceName,
        String sourceUrl,
        String sourceNote
    ) {
    }
}
