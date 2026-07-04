package com.ezone.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

@Service
public class GmsKeyInfoHttpClient implements GmsKeyInfoClient {

    private final RestTemplate restTemplate;
    private final String apiKey;
    private final String keyInfoUrl;

    @Autowired
    public GmsKeyInfoHttpClient(
        RestTemplate restTemplate,
        @Value("${gms.ai.api-key:}") String apiKey,
        @Value("${gms.key-info-url}") String keyInfoUrl
    ) {
        this.restTemplate = restTemplate;
        this.apiKey = apiKey;
        this.keyInfoUrl = StringUtils.hasText(keyInfoUrl) ? keyInfoUrl.trim() : "";
    }

    GmsKeyInfoHttpClient(RestTemplate restTemplate, String apiKey) {
        this(restTemplate, apiKey, "");
    }

    @Override
    public GmsKeyStatus getKeyStatus() {
        if (!StringUtils.hasText(apiKey)) {
            return new GmsKeyStatus(false, null, null, "GMS API key is not configured.");
        }
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(apiKey);
            ResponseEntity<JsonNode> response = restTemplate.exchange(
                keyInfoUrl,
                HttpMethod.GET,
                new HttpEntity<>(headers),
                JsonNode.class
            );
            JsonNode body = response.getBody();
            if (body == null) {
                return new GmsKeyStatus(true, null, null, "GMS key status was empty.");
            }
            Integer remainCredit = body.hasNonNull("remainCredit") ? body.path("remainCredit").asInt() : null;
            String expiredDate = body.path("expiredDate").asText(null);
            if (remainCredit != null && remainCredit <= 0) {
                return new GmsKeyStatus(false, remainCredit, expiredDate, "GMS credit is exhausted.");
            }
            return new GmsKeyStatus(true, remainCredit, expiredDate, null);
        } catch (RuntimeException exception) {
            return new GmsKeyStatus(true, null, null, "GMS key status could not be checked.");
        }
    }

}
