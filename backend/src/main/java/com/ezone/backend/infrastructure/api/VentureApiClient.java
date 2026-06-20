package com.ezone.backend.infrastructure.api;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.util.ArrayList;
import java.util.List;

@Component
public class VentureApiClient {

    private static final Logger log = LoggerFactory.getLogger(VentureApiClient.class);
    
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final String apiKey;

    public VentureApiClient(RestTemplate restTemplate, ObjectMapper objectMapper, @Value("${PUBLIC_DATA_API_KEY:}") String apiKey) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
        this.apiKey = apiKey;
    }

    public static class VentureData {
        private String companyName;
        private String ventureType;

        public VentureData(String companyName, String ventureType) {
            this.companyName = companyName;
            this.ventureType = ventureType;
        }

        public String getCompanyName() { return companyName; }
        public String getVentureType() { return ventureType; }
    }

    public List<VentureData> searchVentureByName(String companyName) {
        if (apiKey == null || apiKey.isEmpty()) {
            log.warn("PUBLIC_DATA_API_KEY is not set. Skipping Venture API call.");
            return new ArrayList<>();
        }

        try {
            // NOTE: Using a generic public data API URL for demonstration, as the exact endpoint requires specific docs.
            URI uri = UriComponentsBuilder.fromHttpUrl("http://apis.data.go.kr/1423000/VentureCompanyService/getVentureCompanyList")
                    .queryParam("serviceKey", apiKey)
                    .queryParam("pageNo", 1)
                    .queryParam("numOfRows", 10)
                    .queryParam("entCmpNm", companyName)
                    .queryParam("type", "json")
                    .build(true)
                    .toUri();

            log.info("Calling Venture API for company: {}", companyName);
            ResponseEntity<String> response = restTemplate.getForEntity(uri, String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return parseResponse(response.getBody());
            } else {
                log.warn("Venture API returned status {}: {}", response.getStatusCode(), response.getBody());
            }
        } catch (Exception e) {
            log.error("Failed to fetch data from Venture API for company {}", companyName, e);
        }
        return new ArrayList<>();
    }

    private List<VentureData> parseResponse(String responseBody) {
        List<VentureData> results = new ArrayList<>();
        try {
            JsonNode rootNode = objectMapper.readTree(responseBody);
            JsonNode itemsNode = rootNode.path("response").path("body").path("items").path("item");

            if (itemsNode.isArray()) {
                for (JsonNode itemNode : itemsNode) {
                    String name = itemNode.path("entCmpNm").asText("");
                    String type = itemNode.path("vntrTpNm").asText(""); // 벤처유형명

                    if (!name.isEmpty()) {
                        results.add(new VentureData(name, type));
                    }
                }
            } else if (itemsNode.isObject()) {
                 String name = itemsNode.path("entCmpNm").asText("");
                 String type = itemsNode.path("vntrTpNm").asText("");
                 if (!name.isEmpty()) {
                     results.add(new VentureData(name, type));
                 }
            }
        } catch (Exception e) {
            log.warn("Failed to parse Venture API response", e);
        }
        return results;
    }
}
