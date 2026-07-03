package com.ezone.backend.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Optional;
import java.util.function.Function;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

class OpenDartCompanyOverviewProviderTest {

    private static final String OPENDART_API_BASE_URL = "https://opendart.fss.or.kr/api";
    private static final String OPENDART_COMPANY_OVERVIEW_SOURCE_URL =
        "https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS001&apiId=2019002";

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void matchesCorpCodeAndMapsCompanyOverview() throws Exception {
        StubRestTemplate restTemplate = new StubRestTemplate(zip("""
                <result>
                  <list>
                    <corp_code>00126380</corp_code>
                    <corp_name>삼성전자</corp_name>
                    <stock_code>005930</stock_code>
                  </list>
                </result>
                """));
        restTemplate.respondWithCompanyJson(json("""
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
        assertThat(enrichment.get().sourceName()).isEqualTo("OpenDART 기업개황");
        assertThat(enrichment.get().sourceNote()).isEqualTo("OpenDART 기업개황 기준");
        assertThat(enrichment.get().sources()).first()
            .extracting(RealtimeCompanyEnrichment.Source::sourceName, RealtimeCompanyEnrichment.Source::sourceNote)
            .containsExactly("OpenDART 기업개황", "OpenDART 기업개황 기준");
    }

    @ParameterizedTest
    @CsvSource({
        "63120, 포털 및 기타 인터넷 정보매개 서비스업",
        "64121, 국내은행",
        "264, 통신 및 방송장비 제조업",
        "62010, 컴퓨터 프로그래밍 서비스업",
        "62021, 컴퓨터시스템 통합 자문 및 구축 서비스업",
        "4791, 통신 판매업",
        "64999, 그 외 기타 분류 안된 금융업",
        "64201, 신탁업 및 집합투자업"
    })
    void mapsKnownIndustryCodesToKoreanLabels(String industryCode, String expectedLabel) throws Exception {
        Optional<RealtimeCompanyEnrichment> enrichment = enrichWithIndustryCode(industryCode, "www.example.co.kr");

        assertThat(enrichment).isPresent();
        assertThat(enrichment.get().industry()).isEqualTo(expectedLabel);
    }

    @Test
    void keepsUnknownIndustryCodeAsReadableFallbackAndBlankAsMissing() throws Exception {
        Optional<RealtimeCompanyEnrichment> unknown = enrichWithIndustryCode("99999", "www.example.co.kr");
        Optional<RealtimeCompanyEnrichment> blank = enrichWithIndustryCode("", "www.example.co.kr");

        assertThat(unknown).isPresent();
        assertThat(unknown.get().industry()).isEqualTo("업종코드 99999");
        assertThat(blank).isPresent();
        assertThat(blank.get().industry()).isNull();
    }

    @ParameterizedTest
    @CsvSource({
        "www.example.co.kr, https://www.example.co.kr, example.co.kr",
        "https://careers.example.co.kr, https://careers.example.co.kr, careers.example.co.kr",
        "http://legacy.example.co.kr, http://legacy.example.co.kr, legacy.example.co.kr"
    })
    void normalizesHomepageSchemeWithoutRewritingSafeHttpSchemes(
        String rawHomepage,
        String expectedHomepage,
        String expectedDomain
    ) throws Exception {
        Optional<RealtimeCompanyEnrichment> enrichment = enrichWithIndustryCode("63120", rawHomepage);

        assertThat(enrichment).isPresent();
        assertThat(enrichment.get().homepageUrl()).isEqualTo(expectedHomepage);
        assertThat(enrichment.get().domain()).isEqualTo(expectedDomain);
    }

    @Test
    void returnsEmptyWhenApiKeyIsMissingOrOpenDartRequestFails() throws Exception {
        StubRestTemplate restTemplate = new StubRestTemplate(new byte[0]);
        OpenDartCompanyOverviewProvider missingKeyProvider = new OpenDartCompanyOverviewProvider(
            restTemplate,
            "",
            OPENDART_API_BASE_URL,
            OPENDART_COMPANY_OVERVIEW_SOURCE_URL
        );
        assertThat(missingKeyProvider.enrich("테스트회사")).isEmpty();

        restTemplate = new StubRestTemplate(zip("""
                <result>
                  <list><corp_code>00999999</corp_code><corp_name>테스트회사</corp_name></list>
                </result>
                """));
        restTemplate.throwCompanyRequest(new RestClientException("OpenDART unavailable"));
        OpenDartCompanyOverviewProvider failingProvider = new OpenDartCompanyOverviewProvider(
            restTemplate,
            "opendart-key",
            OPENDART_API_BASE_URL,
            OPENDART_COMPANY_OVERVIEW_SOURCE_URL
        );

        assertThat(failingProvider.enrich("테스트회사")).isEmpty();
    }

    @Test
    void choosesMostSpecificBidirectionalCompanyNameMatch() throws Exception {
        StubRestTemplate restTemplate = new StubRestTemplate(zip("""
                <result>
                  <list><corp_code>00000001</corp_code><corp_name>KB</corp_name></list>
                  <list><corp_code>00164876</corp_code><corp_name>KB금융</corp_name></list>
                </result>
                """));
        restTemplate.respondWithCompanyJson(json("""
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

    @Test
    void normalizesEnglishPunctuationWhenMatchingCorpCode() throws Exception {
        StubRestTemplate restTemplate = new StubRestTemplate(zip("""
                <result>
                  <list>
                    <corp_code>00112345</corp_code>
                    <corp_name>DB Inc.</corp_name>
                    <stock_code>012030</stock_code>
                  </list>
                </result>
                """));
        restTemplate.respondWithCompanyJson(json("""
                {
                  "status": "000",
                  "corp_code": "00112345",
                  "corp_name": "DB Inc.",
                  "corp_cls": "Y",
                  "stock_code": "012030"
                }
                """));

        OpenDartCompanyOverviewProvider provider = new OpenDartCompanyOverviewProvider(
            restTemplate,
            "opendart-key",
            OPENDART_API_BASE_URL,
            OPENDART_COMPANY_OVERVIEW_SOURCE_URL
        );

        Optional<RealtimeCompanyEnrichment> enrichment = provider.enrich("DB Inc");

        assertThat(enrichment).isPresent();
        assertThat(enrichment.get().corpCode()).isEqualTo("00112345");
        assertThat(enrichment.get().stockCode()).isEqualTo("012030");
    }

    @Test
    void resolvesEnglishLegalSuffixesWithoutCompanySpecificAliases() throws Exception {
        String corpCodeXml = """
            <result>
              <list><corp_code>00266961</corp_code><corp_name>NAVER</corp_name><stock_code>035420</stock_code></list>
              <list><corp_code>01133217</corp_code><corp_name>네이버제트</corp_name><stock_code></stock_code></list>
              <list><corp_code>01234567</corp_code><corp_name>네이버파이낸셜</corp_name><stock_code></stock_code></list>
            </result>
            """;

        assertThat(enrichWithCorpFixture("NAVER", corpCodeXml).get().corpCode()).isEqualTo("00266961");
        assertThat(enrichWithCorpFixture("Naver Corp", corpCodeXml).get().corpCode()).isEqualTo("00266961");
        assertThat(enrichWithCorpFixture("Naver Corporation", corpCodeXml).get().corpCode()).isEqualTo("00266961");
        assertThat(enrichWithCorpFixture("Naver, Inc.", corpCodeXml).get().corpCode()).isEqualTo("00266961");
        assertThat(enrichWithCorpFixture("네이버", corpCodeXml)).isEmpty();
    }

    @Test
    void resolvesDbIncByGenericEnglishLegalSuffixNormalization() throws Exception {
        String corpCodeXml = """
            <result>
              <list><corp_code>00112345</corp_code><corp_name>DB Inc.</corp_name><stock_code>012030</stock_code></list>
            </result>
            """;

        assertThat(enrichWithCorpFixture("DB Inc", corpCodeXml).get().corpCode()).isEqualTo("00112345");
        assertThat(enrichWithCorpFixture("DB Inc.", corpCodeXml).get().corpCode()).isEqualTo("00112345");
        assertThat(enrichWithCorpFixture("DB Incorporated", corpCodeXml).get().corpCode()).isEqualTo("00112345");
    }

    @Test
    void resolvesKoreanLegalPrefixesWithoutCompanySpecificAliases() throws Exception {
        String corpCodeXml = """
            <result>
              <list><corp_code>00126380</corp_code><corp_name>삼성전자</corp_name><stock_code>005930</stock_code></list>
            </result>
            """;

        assertThat(enrichWithCorpFixture("(주)삼성전자", corpCodeXml).get().corpCode()).isEqualTo("00126380");
        assertThat(enrichWithCorpFixture("삼성전자 주식회사", corpCodeXml).get().corpCode()).isEqualTo("00126380");
    }

    @Test
    void keepsDistinctShortCompanyNamesFromContainsFallback() throws Exception {
        String corpCodeXml = """
            <result>
              <list><corp_code>10000001</corp_code><corp_name>카카오뱅크</corp_name><stock_code>323410</stock_code></list>
              <list><corp_code>10000002</corp_code><corp_name>카카오페이</corp_name><stock_code>377300</stock_code></list>
            </result>
            """;

        assertThat(enrichWithCorpFixture("카카오", corpCodeXml)).isEmpty();
    }

    @Test
    void keepsApprovedPlatformNamesDistinctWhenCorpCodesExist() throws Exception {
        String corpCodeXml = """
            <result>
              <list><corp_code>10000000</corp_code><corp_name>카카오</corp_name><stock_code>035720</stock_code></list>
              <list><corp_code>10000001</corp_code><corp_name>카카오뱅크</corp_name><stock_code>323410</stock_code></list>
              <list><corp_code>10000003</corp_code><corp_name>토스뱅크</corp_name><stock_code></stock_code></list>
              <list><corp_code>10000004</corp_code><corp_name>쿠팡</corp_name><stock_code></stock_code></list>
              <list><corp_code>10000005</corp_code><corp_name>라인</corp_name><stock_code></stock_code></list>
            </result>
            """;

        assertThat(enrichWithCorpFixture("카카오", corpCodeXml).get().corpCode()).isEqualTo("10000000");
        assertThat(enrichWithCorpFixture("카카오뱅크", corpCodeXml).get().corpCode()).isEqualTo("10000001");
        assertThat(enrichWithCorpFixture("토스뱅크", corpCodeXml).get().corpCode()).isEqualTo("10000003");
        assertThat(enrichWithCorpFixture("쿠팡", corpCodeXml).get().corpCode()).isEqualTo("10000004");
        assertThat(enrichWithCorpFixture("라인", corpCodeXml).get().corpCode()).isEqualTo("10000005");
    }

    @Test
    void returnsEmptyForMalformedCompanyNamesAndProviderFailures() throws Exception {
        StubRestTemplate restTemplate = new StubRestTemplate(new byte[0]);
        restTemplate.throwCorpCodeRequest(new IllegalArgumentException("bad fixture"));
        OpenDartCompanyOverviewProvider provider = new OpenDartCompanyOverviewProvider(
            restTemplate,
            "opendart-key",
            OPENDART_API_BASE_URL,
            OPENDART_COMPANY_OVERVIEW_SOURCE_URL
        );

        assertThat(provider.enrich(null)).isEmpty();
        assertThat(provider.enrich("")).isEmpty();
        assertThat(provider.enrich("...")).isEmpty();
    }

    private Optional<RealtimeCompanyEnrichment> enrichWithCorpFixture(String companyName, String corpCodeXml) throws Exception {
        StubRestTemplate restTemplate = new StubRestTemplate(zip(corpCodeXml));
        restTemplate.respondWithCompanyUri(uri -> json("""
                {
                  "status": "000",
                  "corp_code": "%s",
                  "corp_cls": "Y",
                  "stock_code": "035420",
                  "hm_url": "www.example.com"
                }
                """.formatted(corpCodeFrom(uri))));

        OpenDartCompanyOverviewProvider provider = new OpenDartCompanyOverviewProvider(
            restTemplate,
            "opendart-key",
            OPENDART_API_BASE_URL,
            OPENDART_COMPANY_OVERVIEW_SOURCE_URL
        );
        return provider.enrich(companyName);
    }

    private static String corpCodeFrom(String uri) {
        return UriComponentsBuilder.fromUriString(uri).build().getQueryParams().getFirst("corp_code");
    }

    private Optional<RealtimeCompanyEnrichment> enrichWithIndustryCode(String industryCode, String homepage) throws Exception {
        StubRestTemplate restTemplate = new StubRestTemplate(zip("""
                <result>
                  <list>
                    <corp_code>00999999</corp_code>
                    <corp_name>테스트회사</corp_name>
                    <stock_code>099999</stock_code>
                  </list>
                </result>
                """));
        restTemplate.respondWithCompanyJson(json("""
                {
                  "status": "000",
                  "corp_code": "00999999",
                  "corp_name": "테스트회사",
                  "corp_cls": "K",
                  "stock_code": "099999",
                  "hm_url": "%s",
                  "induty_code": "%s"
                }
                """.formatted(homepage, industryCode)));

        OpenDartCompanyOverviewProvider provider = new OpenDartCompanyOverviewProvider(
            restTemplate,
            "opendart-key",
            OPENDART_API_BASE_URL,
            OPENDART_COMPANY_OVERVIEW_SOURCE_URL
        );

        return provider.enrich("테스트회사");
    }

    private JsonNode json(String body) {
        try {
            return objectMapper.readTree(body);
        } catch (Exception exception) {
            throw new IllegalArgumentException(exception);
        }
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

    private static final class StubRestTemplate extends RestTemplate {

        private final byte[] corpCodeZip;
        private RuntimeException corpCodeException;
        private RuntimeException companyException;
        private Function<String, JsonNode> companyResponse = uri -> null;

        private StubRestTemplate(byte[] corpCodeZip) {
            this.corpCodeZip = corpCodeZip;
        }

        private void respondWithCompanyJson(JsonNode companyJson) {
            this.companyResponse = uri -> companyJson;
        }

        private void respondWithCompanyUri(Function<String, JsonNode> companyResponse) {
            this.companyResponse = companyResponse;
        }

        private void throwCorpCodeRequest(RuntimeException exception) {
            this.corpCodeException = exception;
        }

        private void throwCompanyRequest(RuntimeException exception) {
            this.companyException = exception;
        }

        @Override
        public <T> T getForObject(String url, Class<T> responseType, Object... uriVariables) throws RestClientException {
            if (url.contains("corpCode.xml")) {
                if (corpCodeException != null) {
                    throw corpCodeException;
                }
                return responseType.cast(corpCodeZip);
            }
            if (url.contains("company.json")) {
                if (companyException != null) {
                    throw companyException;
                }
                return responseType.cast(companyResponse.apply(url));
            }
            throw new IllegalArgumentException("Unexpected URL: " + url);
        }
    }
}
