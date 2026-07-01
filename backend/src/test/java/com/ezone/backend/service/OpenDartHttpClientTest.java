package com.ezone.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.ezone.backend.dto.dart.DartDisclosureResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.web.client.RestTemplate;

class OpenDartHttpClientTest {

    private static final String OPENDART_API_BASE_URL = "https://opendart.fss.or.kr/api";
    private static final String OPENDART_VIEWER_BASE_URL = "https://dart.fss.or.kr/dsaf001/main.do";

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void downloadDocumentTextFocusesLongReportsAroundJobApplicationSignals() throws Exception {
        RestTemplate restTemplate = Mockito.mock(RestTemplate.class);
        String longPrefix = "일반 주석 ".repeat(5000);
        String businessSection = "II. 사업의 내용 주요 제품 서비스 연구개발 투자 위험 재무 신호";
        String longSuffix = "반복 주석 ".repeat(5000);
        when(restTemplate.getForObject(any(String.class), eq(byte[].class)))
            .thenReturn(zip("""
                <DOCUMENT>
                  <TITLE>사업보고서</TITLE>
                  <BODY>%s %s %s</BODY>
                </DOCUMENT>
                """.formatted(longPrefix, businessSection, longSuffix)));

        String documentText = new OpenDartHttpClient(
            restTemplate,
            "opendart-key",
            OPENDART_API_BASE_URL,
            OPENDART_VIEWER_BASE_URL
        )
            .downloadDocumentText("20260330000123");

        assertThat(documentText).contains("사업의 내용", "연구개발", "재무 신호");
        assertThat(documentText.length()).isLessThanOrEqualTo(24000);
    }

    @Test
    void listPeriodicDisclosuresMatchesKoreanPeriodicReportNames() throws Exception {
        RestTemplate restTemplate = Mockito.mock(RestTemplate.class);
        when(restTemplate.getForObject(contains("corpCode.xml"), eq(byte[].class)))
            .thenReturn(zip("""
                <result>
                  <list>
                    <corp_code>00000001</corp_code>
                    <corp_name>KB</corp_name>
                  </list>
                  <list>
                    <corp_code>00164876</corp_code>
                    <corp_name>KB금융</corp_name>
                  </list>
                </result>
                """));
        when(restTemplate.getForObject(contains("list.json"), eq(JsonNode.class)))
            .thenAnswer(invocation -> {
                String uri = invocation.getArgument(0);
                if (!uri.contains("corp_code=00164876")) {
                    return objectMapper.readTree("{\"status\":\"013\",\"message\":\"No data\"}");
                }
                return objectMapper.readTree("""
                    {
                      "status": "000",
                      "list": [
                        {
                          "report_nm": "반기보고서 (2026.06)",
                          "rcept_no": "20260814000002",
                          "pblntf_detail_ty": "A002",
                          "rcept_dt": "20260814",
                          "corp_name": "KB금융"
                        },
                        {
                          "report_nm": "분기보고서 (2026.03)",
                          "rcept_no": "20260515000003",
                          "pblntf_detail_ty": "A003",
                          "rcept_dt": "20260515",
                          "corp_name": "KB금융"
                        },
                        {
                          "report_nm": "사업보고서 (2025.12)",
                          "rcept_no": "20260318000001",
                          "pblntf_detail_ty": "A001",
                          "rcept_dt": "20260318",
                          "corp_name": "KB금융"
                        },
                        {
                          "report_nm": "주요사항보고서",
                          "rcept_no": "20260301000001",
                          "pblntf_detail_ty": "B001",
                          "rcept_dt": "20260301",
                          "corp_name": "KB금융"
                        }
                      ]
                    }
                    """);
            });

        List<DartDisclosureResponse> disclosures = new OpenDartHttpClient(
            restTemplate,
            "opendart-key",
            OPENDART_API_BASE_URL,
            OPENDART_VIEWER_BASE_URL
        )
            .listPeriodicDisclosures("KB금융지주");

        assertThat(disclosures)
            .extracting(DartDisclosureResponse::rceptNo)
            .containsExactly("20260814000002", "20260515000003", "20260318000001");
        assertThat(disclosures.get(0).recommended()).isTrue();
        assertThat(disclosures.get(1).recommended()).isFalse();
    }

    @Test
    void listPeriodicDisclosuresFailsClearlyWhenApiKeyIsMissing() {
        RestTemplate restTemplate = Mockito.mock(RestTemplate.class);

        assertThatThrownBy(() -> new OpenDartHttpClient(
            restTemplate,
            "",
            OPENDART_API_BASE_URL,
            OPENDART_VIEWER_BASE_URL
        )
            .listPeriodicDisclosures("네이버"))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("OpenDART API key");
    }

    private static byte[] zip(String xml) throws Exception {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(bytes, StandardCharsets.UTF_8)) {
            zip.putNextEntry(new ZipEntry("document.xml"));
            zip.write(xml.getBytes(StandardCharsets.UTF_8));
            zip.closeEntry();
        }
        return bytes.toByteArray();
    }
}
