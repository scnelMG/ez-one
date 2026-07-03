package com.ezone.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.queryParam;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

class FinancialCommissionCompanyInfoProviderTest {

    @Test
    void matchesCompanyNameAndMapsStudentFriendlyProfileFields() {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        FinancialCommissionCompanyInfoProvider provider = new FinancialCommissionCompanyInfoProvider(
            restTemplate,
            new ObjectMapper(),
            "service-key",
            "https://apis.example.test/financial/company-basic"
        );

        server.expect(once(), requestTo("https://apis.example.test/financial/company-basic?serviceKey=service-key&pageNo=1&numOfRows=100&resultType=json&type=json&corpNm=네이버&companyName=네이버&entrprsNm=네이버"))
            .andExpect(queryParam("corpNm", "네이버"))
            .andRespond(withSuccess(
                """
                {
                  "response": {
                    "body": {
                      "items": {
                        "item": [
                          {
                            "corpNm": "네이버클라우드",
                            "enpRprFnm": "다른대표"
                          },
                          {
                            "corpNm": "네이버",
                            "bzno": "2208162520",
                            "sicNm": "포털 및 기타 인터넷 정보매개 서비스업",
                            "crnoCorpDcdNm": "대기업",
                            "enpRprFnm": "최수연",
                            "enpEstbDt": "19990602",
                            "enpEmpeCnt": "4123",
                            "enpHmpgUrl": "www.navercorp.com",
                            "enpBsadr": "경기도 성남시 분당구 정자일로 95",
                            "enpMainBiz": "인터넷 검색 포털 운영"
                          }
                        ]
                      }
                    }
                  }
                }
                """,
                MediaType.APPLICATION_JSON
            ));

        Optional<RealtimeCompanyEnrichment> enrichment = provider.enrich("네이버");

        assertThat(enrichment).isPresent();
        assertThat(enrichment.get().businessNumber()).isEqualTo("2208162520");
        assertThat(enrichment.get().companyType()).isEqualTo("대기업");
        assertThat(enrichment.get().industry()).isEqualTo("포털 및 기타 인터넷 정보매개 서비스업");
        assertThat(enrichment.get().homepageUrl()).isEqualTo("https://www.navercorp.com");
        assertThat(enrichment.get().domain()).isEqualTo("navercorp.com");
        assertThat(enrichment.get().foundedAt()).isEqualTo("1999-06-02");
        assertThat(enrichment.get().representative()).isEqualTo("최수연");
        assertThat(enrichment.get().employeeCount()).isEqualTo(4123);
        assertThat(enrichment.get().businessSummary()).isEqualTo("인터넷 검색 포털 운영");
        assertThat(enrichment.get().sourceType()).isEqualTo("FINANCIAL_COMMISSION_COMPANY_BASIC");
        assertThat(enrichment.get().sourceName()).isEqualTo("금융위원회 기업기본정보");
        assertThat(enrichment.get().sourceNote()).isEqualTo("공공데이터포털 금융위원회 기업기본정보 기준");
        server.verify();
    }

    @Test
    void returnsEmptyWhenApiKeyEndpointIsMissingOrResponseHasNoExactMatch() {
        RestTemplate restTemplate = new RestTemplate();
        FinancialCommissionCompanyInfoProvider missingKeyProvider = new FinancialCommissionCompanyInfoProvider(
            restTemplate,
            new ObjectMapper(),
            "",
            "https://apis.example.test/financial/company-basic"
        );

        assertThat(missingKeyProvider.enrich("네이버")).isEmpty();

        FinancialCommissionCompanyInfoProvider missingEndpointProvider = new FinancialCommissionCompanyInfoProvider(
            restTemplate,
            new ObjectMapper(),
            "service-key",
            ""
        );

        assertThat(missingEndpointProvider.enrich("네이버")).isEmpty();

        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        FinancialCommissionCompanyInfoProvider provider = new FinancialCommissionCompanyInfoProvider(
            restTemplate,
            new ObjectMapper(),
            "service-key",
            "https://apis.example.test/financial/company-basic"
        );
        server.expect(once(), requestTo("https://apis.example.test/financial/company-basic?serviceKey=service-key&pageNo=1&numOfRows=100&resultType=json&type=json&corpNm=네이버&companyName=네이버&entrprsNm=네이버"))
            .andRespond(withSuccess("{\"response\":{\"body\":{\"items\":{\"item\":[{\"corpNm\":\"네이버클라우드\"}]}}}}", MediaType.APPLICATION_JSON));

        assertThat(provider.enrich("네이버")).isEmpty();
        server.verify();
    }
}
