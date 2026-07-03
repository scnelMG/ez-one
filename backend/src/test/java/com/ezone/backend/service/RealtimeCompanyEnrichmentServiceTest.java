package com.ezone.backend.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class RealtimeCompanyEnrichmentServiceTest {

    @Test
    void returnsPartialEnrichmentWhenProviderThrows() {
        RealtimeCompanyEnrichmentProvider throwingProvider = companyName -> {
            throw new IllegalStateException("provider unavailable");
        };
        RealtimeCompanyEnrichmentProvider partialProvider = companyName -> Optional.of(new RealtimeCompanyEnrichment(
            "navercorp.com",
            "대기업",
            "대기업",
            "포털 및 기타 인터넷 정보매개 서비스업",
            "https://www.navercorp.com",
            null,
            null,
            "인터넷 검색 포털 운영",
            "경기도 성남시 분당구 정자일로 95",
            "FINANCIAL_COMMISSION_COMPANY_BASIC",
            "금융위원회 기업기본정보",
            "https://www.data.go.kr/data/15043184/openapi.do",
            "공공데이터포털 금융위원회 기업기본정보 기준"
        ));
        RealtimeCompanyEnrichmentService service = new RealtimeCompanyEnrichmentService(
            List.of(throwingProvider, partialProvider),
            true
        );

        Optional<RealtimeCompanyEnrichment> enrichment = service.enrich(" 네이버 ");

        assertThat(enrichment).isPresent();
        assertThat(enrichment.get().domain()).isEqualTo("navercorp.com");
        assertThat(enrichment.get().businessSummary()).isEqualTo("인터넷 검색 포털 운영");
        assertThat(enrichment.get().sourceName()).isEqualTo("금융위원회 기업기본정보");
    }

    @Test
    void returnsEmptyWhenDisabledOrCompanyNameIsBlank() {
        RealtimeCompanyEnrichmentProvider partialProvider = companyName -> Optional.of(new RealtimeCompanyEnrichment(
            "navercorp.com",
            "대기업",
            "대기업",
            "포털 및 기타 인터넷 정보매개 서비스업",
            "https://www.navercorp.com",
            null,
            null,
            null,
            null,
            "FINANCIAL_COMMISSION_COMPANY_BASIC",
            "금융위원회 기업기본정보",
            "https://www.data.go.kr/data/15043184/openapi.do",
            "공공데이터포털 금융위원회 기업기본정보 기준"
        ));

        assertThat(new RealtimeCompanyEnrichmentService(List.of(partialProvider), false).enrich("네이버")).isEmpty();
        assertThat(new RealtimeCompanyEnrichmentService(List.of(partialProvider), true).enrich(" ")).isEmpty();
    }
}
