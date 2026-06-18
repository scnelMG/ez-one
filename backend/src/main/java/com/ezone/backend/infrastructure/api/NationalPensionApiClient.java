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
            String urlString = API_URL + "?serviceKey=" + java.net.URLEncoder.encode(serviceKey, "UTF-8") + 
                    "&wkplNm=" + java.net.URLEncoder.encode(companyName, "UTF-8") + 
                    "&pageNo=1&numOfRows=10";
            URI uri = new URI(urlString);

            ResponseEntity<String> response = restTemplate.getForEntity(uri, String.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return parseXmlResponse(response.getBody());
            }
        } catch (Exception e) {
            log.error("Exception while fetching pension data for {}: {}", companyName, e.getMessage(), e);
        }

        return Collections.emptyList();
    }

    private List<CompanyPensionData> parseXmlResponse(String xml) {
        List<CompanyPensionData> list = new java.util.ArrayList<>();
        try {
            javax.xml.parsers.DocumentBuilderFactory factory = javax.xml.parsers.DocumentBuilderFactory.newInstance();
            javax.xml.parsers.DocumentBuilder builder = factory.newDocumentBuilder();
            org.w3c.dom.Document doc = builder.parse(new org.xml.sax.InputSource(new java.io.StringReader(xml)));
            org.w3c.dom.NodeList itemNodes = doc.getElementsByTagName("item");
            for (int i = 0; i < itemNodes.getLength(); i++) {
                org.w3c.dom.Element item = (org.w3c.dom.Element) itemNodes.item(i);
                CompanyPensionData data = new CompanyPensionData();
                data.setCompanyName(getTagValue("wkplNm", item));
                data.setAddress(getTagValue("wkplRoadNmDtlAddr", item));
                
                String employeeCountStr = getTagValue("crrmfJnCnt", item);
                if (employeeCountStr != null && !employeeCountStr.isEmpty()) {
                    try { data.setEmployeeCount(Integer.parseInt(employeeCountStr)); } catch(Exception ignored) {}
                }
                data.setJoinDate(getTagValue("jnScdDt", item));
                list.add(data);
            }
        } catch (Exception e) {
            log.error("XML parse error", e);
        }
        return list;
    }

    private String getTagValue(String tag, org.w3c.dom.Element element) {
        org.w3c.dom.NodeList nodeList = element.getElementsByTagName(tag);
        if (nodeList != null && nodeList.getLength() > 0) {
            org.w3c.dom.Node node = nodeList.item(0);
            if (node != null && node.getTextContent() != null) {
                return node.getTextContent();
            }
        }
        return null;
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
