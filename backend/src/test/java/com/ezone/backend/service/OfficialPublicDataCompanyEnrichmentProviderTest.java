package com.ezone.backend.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.ezone.backend.infrastructure.api.OfficialCompanyApiClient;
import com.ezone.backend.infrastructure.api.OfficialCompanyApiClient.OfficialCompanyMatch;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestTemplate;

class OfficialPublicDataCompanyEnrichmentProviderTest {

    @Test
    void mapsOfficialPublicDataSourceLabelsInReadableKorean() {
        OfficialCompanyApiClient client = new OfficialCompanyApiClient(
            new RestTemplate(),
            new ObjectMapper(),
            "",
            "",
            "",
            "",
            "",
            1
        ) {
            @Override
            public Optional<OfficialCompanyMatch> findPublicInstitution(String companyName) {
                return Optional.of(new OfficialCompanyMatch(
                "ALIO_PUBLIC_INSTITUTION",
                "https://home.kepco.co.kr",
                "home.kepco.co.kr",
                "공기업",
                "1961-07-01",
                null,
                "기관유형: 공기업",
                "전라남도 나주시 전력로 55"
                ));
            }
        };
        OfficialPublicDataCompanyEnrichmentProvider provider = new OfficialPublicDataCompanyEnrichmentProvider(client);

        Optional<RealtimeCompanyEnrichment> enrichment = provider.enrich("한국전력공사");

        assertThat(enrichment).isPresent();
        assertThat(enrichment.get().companyType()).isEqualTo("공공기관");
        assertThat(enrichment.get().industry()).isEqualTo("공기업");
        assertThat(enrichment.get().businessSummary()).isEqualTo("기관유형: 공기업");
        assertThat(enrichment.get().address()).isEqualTo("전라남도 나주시 전력로 55");
        assertThat(enrichment.get().sourceName()).isEqualTo("ALIO 공공기관 경영정보 공개시스템");
        assertThat(enrichment.get().sourceNote()).isEqualTo("공공기관 경영정보 공개시스템 기준");
    }
}
