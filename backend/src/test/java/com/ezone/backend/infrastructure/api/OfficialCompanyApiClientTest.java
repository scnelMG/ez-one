package com.ezone.backend.infrastructure.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.queryParam;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.ezone.backend.infrastructure.api.OfficialCompanyApiClient.OfficialCompanyMatch;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestTemplate;
import org.springframework.test.web.client.MockRestServiceServer;

class OfficialCompanyApiClientTest {

    @Test
    void findsPublicInstitutionFromListEndpointAndSiteUrl() {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        OfficialCompanyApiClient client = new OfficialCompanyApiClient(
            restTemplate,
            new ObjectMapper(),
            "service-key",
            "https://apis.example.test/1051000/public_inst/list",
            "https://apis.example.test/1130000/appnGroupAffiList/appnGroupAffiListApi",
            "",
            "2026",
            2
        );

        server.expect(once(), requestTo("https://apis.example.test/1051000/public_inst/list?serviceKey=service-key&pageNo=1&numOfRows=100&resultType=json&type=json&companyName=한국전력공사&corpNm=한국전력공사&entrprsNm=한국전력공사&affiNm=한국전력공사&instNm=한국전력공사&orgNm=한국전력공사"))
            .andRespond(withSuccess(
                """
                {
                  "resultCode": 200,
                  "result": [{
                    "instNm": "한국전력공사",
                    "instTypeNm": "공기업(시장형)",
                    "instClsfNm": "에너지",
                    "sprvsnInstNm": "기후에너지환경부",
                    "roadNmAddr": "전라남도 나주시 전력로 55",
                    "fndnYmd": "19610701",
                    "siteUrl": "home.kepco.co.kr"
                  }]
                }
                """,
                MediaType.APPLICATION_JSON
            ));

        Optional<OfficialCompanyMatch> match = client.findPublicInstitution("한국전력공사");

        assertThat(match).isPresent();
        assertThat(match.get().homepageUrl()).isEqualTo("https://home.kepco.co.kr");
        assertThat(match.get().domain()).isEqualTo("home.kepco.co.kr");
        assertThat(match.get().industry()).isEqualTo("에너지");
        assertThat(match.get().foundedAt()).isEqualTo("1961-07-01");
        assertThat(match.get().businessSummary()).isEqualTo("기관유형: 공기업(시장형) · 주무부처: 기후에너지환경부 · 분야: 에너지");
        assertThat(match.get().address()).isEqualTo("전라남도 나주시 전력로 55");
        server.verify();
    }

    @Test
    void scansLargeEnterpriseAffiliatePagesWithPresentnYear() {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        OfficialCompanyApiClient client = new OfficialCompanyApiClient(
            restTemplate,
            new ObjectMapper(),
            "service-key",
            "",
            "https://apis.example.test/1130000/appnGroupAffiList/appnGroupAffiListApi",
            "",
            "2026",
            2
        );

        server.expect(once(), requestTo("https://apis.example.test/1130000/appnGroupAffiList/appnGroupAffiListApi?serviceKey=service-key&pageNo=1&numOfRows=100&presentnYear=2026"))
            .andExpect(queryParam("serviceKey", "service-key"))
            .andExpect(queryParam("pageNo", "1"))
            .andExpect(queryParam("numOfRows", "100"))
            .andExpect(queryParam("presentnYear", "2026"))
            .andRespond(withSuccess(
                """
                <?xml version="1.0" encoding="UTF-8"?>
                <appnGroupAffiList>
                  <resultCode>00</resultCode>
                  <totalCount>150</totalCount>
                  <numOfRows>100</numOfRows>
                  <appnGroupAffi><entrprsNm>다른회사</entrprsNm></appnGroupAffi>
                </appnGroupAffiList>
                """.getBytes(StandardCharsets.UTF_8),
                MediaType.APPLICATION_XML
            ));
        server.expect(once(), requestTo("https://apis.example.test/1130000/appnGroupAffiList/appnGroupAffiListApi?serviceKey=service-key&pageNo=2&numOfRows=100&presentnYear=2026"))
            .andExpect(queryParam("serviceKey", "service-key"))
            .andExpect(queryParam("pageNo", "2"))
            .andExpect(queryParam("numOfRows", "100"))
            .andExpect(queryParam("presentnYear", "2026"))
            .andRespond(withSuccess(
                """
                <?xml version="1.0" encoding="UTF-8"?>
                <appnGroupAffiList>
                  <resultCode>00</resultCode>
                  <totalCount>150</totalCount>
                  <numOfRows>100</numOfRows>
                  <appnGroupAffi>
                    <unityGrupNm>카카오</unityGrupNm>
                    <entrprsNm>카카오뱅크</entrprsNm>
                    <rprsntvNm>윤호영</rprsntvNm>
                    <fondDe>20160122</fondDe>
                  </appnGroupAffi>
                </appnGroupAffiList>
                """.getBytes(StandardCharsets.UTF_8),
                MediaType.APPLICATION_XML
            ));

        Optional<OfficialCompanyMatch> match = client.findLargeEnterpriseAffiliate("카카오뱅크");

        assertThat(match).isPresent();
        assertThat(match.get().sourceType()).isEqualTo("FTC_BUSINESS_GROUP");
        assertThat(match.get().industry()).isEqualTo("대기업집단");
        assertThat(match.get().representative()).isEqualTo("윤호영");
        assertThat(match.get().foundedAt()).isEqualTo("2016-01-22");
        assertThat(match.get().businessSummary()).isEqualTo("기업집단: 카카오");
        server.verify();
    }
}
