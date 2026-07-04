package com.ezone.backend.infrastructure.api;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@Component
public class DartApiClient {

    private static final Logger log = LoggerFactory.getLogger(DartApiClient.class);

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final String apiBaseUrl;

    public DartApiClient(RestTemplate restTemplate,
                         @Value("${opendart.api-key:}") String apiKey,
                         @Value("${opendart.api-base-url}") String apiBaseUrl) {
        this.restTemplate = restTemplate;
        this.objectMapper = new ObjectMapper()
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        this.apiKey = apiKey;
        this.apiBaseUrl = trimTrailingSlash(apiBaseUrl);
    }

    public static class DartCompanyData {
        public LocalDate estDt;
        public String hmUrl;
        public Integer employeeCount;
        public String ceoName;
    }

    public DartCompanyData getCompanyData(String corpCode) {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("OPENDART_API_KEY is not configured.");
            return null;
        }

        DartCompanyData data = new DartCompanyData();

        // 1. Fetch Company Overview (company.json)
        String companyUrl = String.format("%s/company.json?crtfc_key=%s&corp_code=%s", apiBaseUrl, apiKey, corpCode);
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.getForObject(companyUrl, Map.class);

            if (response != null && "000".equals(response.get("status"))) {
                data.hmUrl = (String) response.get("hm_url");
                data.ceoName = (String) response.get("ceo_nm");
                String estDtStr = (String) response.get("est_dt");
                if (estDtStr != null && estDtStr.length() == 8) {
                    try {
                        data.estDt = LocalDate.parse(estDtStr, DateTimeFormatter.BASIC_ISO_DATE);
                    } catch (Exception e) {
                        log.warn("Failed to parse est_dt: {} for corpCode: {}", estDtStr, corpCode);
                    }
                }
            }
        } catch (Exception e) {
            log.error("Exception fetching DART company.json for corpCode: {}", corpCode, e);
        }

        // 2. Fetch Employee Status (empSttus.json)
        // Try years 2025, 2024, 2023 in sequence
        int currentYear = LocalDate.now().getYear();
        for (int year = currentYear; year >= currentYear - 3; year--) {
            Integer count = fetchEmployeeCount(corpCode, year);
            if (count != null) {
                data.employeeCount = count;
                break;
            }
        }

        return data;
    }

    private Integer fetchEmployeeCount(String corpCode, int year) {
        String url = String.format("%s/empSttus.json?crtfc_key=%s&corp_code=%s&bsns_year=%d&reprt_code=11011", apiBaseUrl, apiKey, corpCode, year);
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);

            if (response != null && "000".equals(response.get("status"))) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> list = (List<Map<String, Object>>) response.get("list");
                if (list != null) {
                    int totalEmployees = 0;
                    for (Map<String, Object> item : list) {
                        String smStr = (String) item.get("sm");
                        if (smStr != null) {
                            smStr = smStr.replace(",", "").trim();
                            if (!smStr.equals("-")) {
                                try {
                                    totalEmployees += Integer.parseInt(smStr);
                                } catch (NumberFormatException ignored) {}
                            }
                        }
                    }
                    if (totalEmployees > 0) {
                        return totalEmployees;
                    }
                }
            } else if (response != null && "013".equals(response.get("status"))) {
                // "조회된 데이타가 없습니다."
                return null;
            }
        } catch (Exception e) {
            log.warn("Exception fetching DART empSttus.json for corpCode: {}, year: {}", corpCode, year, e);
        }
        return null;
    }

    private String trimTrailingSlash(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        String trimmed = value.trim();
        while (trimmed.endsWith("/")) {
            trimmed = trimmed.substring(0, trimmed.length() - 1);
        }
        return trimmed;
    }
}
