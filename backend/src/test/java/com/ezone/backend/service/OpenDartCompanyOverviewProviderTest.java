package com.ezone.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Optional;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.web.client.RestTemplate;

class OpenDartCompanyOverviewProviderTest {

    private static final String OPENDART_API_BASE_URL = "https://opendart.fss.or.kr/api";
    private static final String OPENDART_COMPANY_OVERVIEW_SOURCE_URL =
        "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS001&apiId=2019002";

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void matchesCorpCodeAndMapsCompanyOverview() throws Exception {
        RestTemplate restTemplate = Mockito.mock(RestTemplate.class);
        when(restTemplate.getForObject(contains("corpCode.xml"), eq(byte[].class)))
            .thenReturn(zip("""
                <result>
                  <list>
                    <corp_code>00126380</corp_code>
                    <corp_name>삼성전자</corp_name>
                    <stock_code>005930</stock_code>
                  </list>
                </result>
                """));
        when(restTemplate.getForObject(contains("company.json"), eq(JsonNode.class)))
            .thenReturn(objectMapper.readTree("""
                {
                  "status": "000",
                  "corp_code": "00126380",
                  "corp_name": "삼성전자",
                  "corp_cls": "Y",
                  "stock_code": "005930",
                  "ceo_nm": "한종희",
                  "corp_addr": "경기도 수원시 영통구 삼성로 129",
                  "hm_url": "www.samsung.com/sec",
                  "induty_code": "264",
                  "est_dt": "19690113"
                }
                """));

        OpenDartCompanyOverviewProvider provider = new OpenDartCompanyOverviewProvider(
            restTemplate,
            "opendart-key",
            OPENDART_API_BASE_URL,
            OPENDART_COMPANY_OVERVIEW_SOURCE_URL
        );

        Optional<RealtimeCompanyEnrichment> enrichment = provider.enrich("삼성전자");

        assertThat(enrichment).isPresent();
        assertThat(enrichment.get().corpCode()).isEqualTo("00126380");
        assertThat(enrichment.get().stockCode()).isEqualTo("005930");
        assertThat(enrichment.get().companyCategory()).isEqualTo("유가증권시장");
        assertThat(enrichment.get().representative()).isEqualTo("한종희");
        assertThat(enrichment.get().address()).isEqualTo("경기도 수원시 영통구 삼성로 129");
        assertThat(enrichment.get().homepageUrl()).isEqualTo("https://www.samsung.com/sec");
        assertThat(enrichment.get().domain()).isEqualTo("samsung.com");
        assertThat(enrichment.get().foundedAt()).isEqualTo("1969-01-13");
        assertThat(enrichment.get().sourceType()).isEqualTo("OPENDART_COMPANY_OVERVIEW");
    }

    @Test
    void choosesMostSpecificBidirectionalCompanyNameMatch() throws Exception {
        RestTemplate restTemplate = Mockito.mock(RestTemplate.class);
        when(restTemplate.getForObject(contains("corpCode.xml"), eq(byte[].class)))
            .thenReturn(zip("""
                <result>
                  <list><corp_code>00000001</corp_code><corp_name>KB</corp_name></list>
                  <list><corp_code>00164876</corp_code><corp_name>KB금융</corp_name></list>
                </result>
                """));
        when(restTemplate.getForObject(contains("company.json"), eq(JsonNode.class)))
            .thenAnswer(invocation -> objectMapper.readTree("""
                {
                  "status": "000",
                  "corp_code": "00164876",
                  "corp_name": "KB금융",
                  "corp_cls": "Y"
                }
                """));

        OpenDartCompanyOverviewProvider provider = new OpenDartCompanyOverviewProvider(
            restTemplate,
            "opendart-key",
            OPENDART_API_BASE_URL,
            OPENDART_COMPANY_OVERVIEW_SOURCE_URL
        );

        Optional<RealtimeCompanyEnrichment> enrichment = provider.enrich("KB금융지주");

        assertThat(enrichment).isPresent();
        assertThat(enrichment.get().corpCode()).isEqualTo("00164876");
    }

    private static byte[] zip(String xml) throws Exception {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(bytes, StandardCharsets.UTF_8)) {
            zip.putNextEntry(new ZipEntry("corpCode.xml"));
            zip.write(xml.getBytes(StandardCharsets.UTF_8));
            zip.closeEntry();
        }
        return bytes.toByteArray();
    }
}
