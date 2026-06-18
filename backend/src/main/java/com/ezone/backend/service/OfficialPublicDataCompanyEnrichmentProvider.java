package com.ezone.backend.service;

import com.ezone.backend.infrastructure.api.OfficialCompanyApiClient;
import com.ezone.backend.infrastructure.api.OfficialCompanyApiClient.OfficialCompanyMatch;
import java.util.Optional;
import org.springframework.stereotype.Component;

@Component
class OfficialPublicDataCompanyEnrichmentProvider implements RealtimeCompanyEnrichmentProvider {

    private static final String ALIO_SOURCE_URL = "https://alio.go.kr/";
    private static final String FTC_SOURCE_URL = "https://www.egroup.go.kr/";
    private static final String MME_SOURCE_URL = "https://www.mme.or.kr/PGPC0010.do";

    private final OfficialCompanyApiClient client;

    OfficialPublicDataCompanyEnrichmentProvider(OfficialCompanyApiClient client) {
        this.client = client;
    }

    @Override
    public Optional<RealtimeCompanyEnrichment> enrich(String companyName) {
        return client.findPublicInstitution(companyName)
            .map(this::publicInstitution)
            .or(() -> client.findLargeEnterpriseAffiliate(companyName).map(this::largeEnterprise))
            .or(() -> client.findMiddleMarketCompany(companyName).map(this::middleMarket));
    }

    private RealtimeCompanyEnrichment publicInstitution(OfficialCompanyMatch match) {
        return new RealtimeCompanyEnrichment(
            match.domain(),
            "공공기관",
            "공공기관",
            fallback(match.industry(), "공공"),
            match.homepageUrl(),
            match.foundedAt(),
            match.representative(),
            match.businessSummary(),
            match.address(),
            "ALIO_PUBLIC_INSTITUTION",
            "ALIO 공공기관 경영정보 공개시스템",
            ALIO_SOURCE_URL,
            "공공기관 경영정보 공개시스템 기준"
        );
    }

    private RealtimeCompanyEnrichment largeEnterprise(OfficialCompanyMatch match) {
        return new RealtimeCompanyEnrichment(
            match.domain(),
            "대기업",
            "대기업",
            fallback(match.industry(), "대기업집단"),
            match.homepageUrl(),
            match.foundedAt(),
            match.representative(),
            match.businessSummary(),
            match.address(),
            "FTC_BUSINESS_GROUP",
            "공정거래위원회 기업집단포털",
            FTC_SOURCE_URL,
            "공시대상기업집단 소속회사 기준"
        );
    }

    private RealtimeCompanyEnrichment middleMarket(OfficialCompanyMatch match) {
        return new RealtimeCompanyEnrichment(
            match.domain(),
            "중견기업",
            "중견기업",
            fallback(match.industry(), "중견기업"),
            match.homepageUrl(),
            match.foundedAt(),
            match.representative(),
            match.businessSummary(),
            match.address(),
            "MME_CONFIRMATION",
            "중견기업정보마당",
            MME_SOURCE_URL,
            "중견기업 확인서 발급기업 공개 기준"
        );
    }

    private String fallback(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }
}
