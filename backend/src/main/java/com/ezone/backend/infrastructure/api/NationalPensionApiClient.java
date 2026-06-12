package com.ezone.backend.infrastructure.api;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.Collections;
import java.util.List;

@Component
public class NationalPensionApiClient {

    private static final Logger log = LoggerFactory.getLogger(NationalPensionApiClient.class);

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final String serviceKey;

    private static final String API_URL = "http://apis.data.go.kr/B552015/NpsBplcInfoInqireServiceV2/getBassInfoSearchV2";

    public NationalPensionApiClient(RestTemplate restTemplate,
                                    @Value("${public-data.api.key}") String serviceKey) {
        this.restTemplate = restTemplate;
        this.objectMapper = new ObjectMapper()
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        this.serviceKey = serviceKey;
    }

    public List<CompanyPensionData> searchCompanyByName(String companyName) {
        if (serviceKey == null || serviceKey.isBlank()) {
            log.warn("PUBLIC_DATA_API_KEY is not configured.");
            return Collections.emptyList();
        }

        try {
            URI uri = UriComponentsBuilder.fromHttpUrl(API_URL)
                    .queryParam("serviceKey", serviceKey)
                    .queryParam("wkpl_nm", companyName)
                    .queryParam("pageNo", 1)
                    .queryParam("numOfRows", 10)
                    .queryParam("resultType", "json")
                    .build()
                    .toUri();

            ResponseEntity<String> response = restTemplate.getForEntity(uri, String.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                PensionApiResponse apiResponse = objectMapper.readValue(response.getBody(), PensionApiResponse.class);
                if (apiResponse != null && apiResponse.getResponse() != null && apiResponse.getResponse().getBody() != null) {
                    return apiResponse.getResponse().getBody().getItems();
                }
            } else {
                log.error("Failed to fetch pension data for {}: {}", companyName, response.getStatusCode());
            }
        } catch (Exception e) {
            log.error("Exception while fetching pension data for {}: {}", companyName, e.getMessage(), e);
        }
        return Collections.emptyList();
    }

    public static class PensionApiResponse {
        private Response response;
        public Response getResponse() { return response; }
        public void setResponse(Response response) { this.response = response; }

        public static class Response {
            private Body body;
            public Body getBody() { return body; }
            public void setBody(Body body) { this.body = body; }

            public static class Body {
                private List<CompanyPensionData> items = Collections.emptyList();
                public List<CompanyPensionData> getItems() { return items; }
                public void setItems(List<CompanyPensionData> items) { this.items = items; }
            }
        }
    }

    public static class CompanyPensionData {
        @JsonProperty("wkpl_nm")
        private String companyName;

        @JsonProperty("wkpl_도로명_주소")
        private String address;

        @JsonProperty("ldong_addr_mg_dong_rgno")
        private String dongCode;

        @JsonProperty("jn_scd_dt")
        private String joinDate;

        @JsonProperty("vld_scd_dt")
        private String withdrawalDate;

        @JsonProperty("crrmf_jn_cnt")
        private Integer employeeCount;

        @JsonProperty("crrmf_mp11_amt")
        private Long pensionAmount;

        public String getCompanyName() { return companyName; }
        public void setCompanyName(String companyName) { this.companyName = companyName; }
        public String getAddress() { return address; }
        public void setAddress(String address) { this.address = address; }
        public String getDongCode() { return dongCode; }
        public void setDongCode(String dongCode) { this.dongCode = dongCode; }
        public String getJoinDate() { return joinDate; }
        public void setJoinDate(String joinDate) { this.joinDate = joinDate; }
        public String getWithdrawalDate() { return withdrawalDate; }
        public void setWithdrawalDate(String withdrawalDate) { this.withdrawalDate = withdrawalDate; }
        public Integer getEmployeeCount() { return employeeCount; }
        public void setEmployeeCount(Integer employeeCount) { this.employeeCount = employeeCount; }
        public Long getPensionAmount() { return pensionAmount; }
        public void setPensionAmount(Long pensionAmount) { this.pensionAmount = pensionAmount; }
    }
}
