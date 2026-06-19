package com.ezone.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.ArrayDeque;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Queue;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

@Component
@Order(10)
class FinancialCommissionCompanyInfoProvider implements RealtimeCompanyEnrichmentProvider {

    private static final String SOURCE_TYPE = "FINANCIAL_COMMISSION_COMPANY_BASIC";
    private static final String SOURCE_NAME = "금융위원회 기업기본정보";
    private static final String SOURCE_URL = "https://www.data.go.kr/data/15043184/openapi.do";
    private static final String SOURCE_NOTE = "공공데이터포털 금융위원회 기업기본정보 기준";
    private static final List<String> NAME_FIELDS = List.of("corpNm", "enpNm", "companyName", "entrprsNm");
    private static final List<String> INDUSTRY_FIELDS = List.of("sicNm", "indutyNm", "industry", "bizcndNm");
    private static final List<String> CATEGORY_FIELDS = List.of("crnoCorpDcdNm", "corpDcdNm", "companyCategory");
    private static final List<String> CEO_FIELDS = List.of("enpRprFnm", "ceoNm", "ceoName", "representative");
    private static final List<String> FOUNDED_FIELDS = List.of("enpEstbDt", "estbDt", "foundedAt");
    private static final List<String> EMPLOYEE_FIELDS = List.of("enpEmpeCnt", "employeeCount", "empCnt");
    private static final List<String> HOMEPAGE_FIELDS = List.of("enpHmpgUrl", "homepageUrl", "hmpgUrl", "siteUrl");
    private static final List<String> ADDRESS_FIELDS = List.of("enpBsadr", "address", "roadNmAddr");
    private static final List<String> BUSINESS_FIELDS = List.of("enpMainBiz", "mainBiz", "businessSummary");
    private static final List<String> BUSINESS_NUMBER_FIELDS = List.of("bzno", "bizrno", "businessNumber");

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final String serviceKey;
    private final String endpoint;

    FinancialCommissionCompanyInfoProvider(
        RestTemplate restTemplate,
        ObjectMapper objectMapper,
        @Value("${public-data.api.key:}") String serviceKey,
        @Value("${company-enrichment.financial-company-basic-info.url:}") String endpoint
    ) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
        this.serviceKey = serviceKey;
        this.endpoint = endpoint;
    }

    @Override
    public Optional<RealtimeCompanyEnrichment> enrich(String companyName) {
        if (!StringUtils.hasText(serviceKey) || !StringUtils.hasText(endpoint) || !StringUtils.hasText(companyName)) {
            return Optional.empty();
        }
        try {
            URI uri = UriComponentsBuilder.fromHttpUrl(endpoint)
                .queryParam("serviceKey", serviceKey)
                .queryParam("pageNo", 1)
                .queryParam("numOfRows", 100)
                .queryParam("resultType", "json")
                .queryParam("type", "json")
                .queryParam("corpNm", companyName)
                .queryParam("companyName", companyName)
                .queryParam("entrprsNm", companyName)
                .build(false)
                .toUri();
            ResponseEntity<byte[]> response = restTemplate.getForEntity(uri, byte[].class);
            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                return Optional.empty();
            }
            String body = new String(response.getBody(), StandardCharsets.UTF_8);
            return findExactCompany(body, companyName).map(this::toEnrichment);
        } catch (IllegalArgumentException | RestClientException exception) {
            return Optional.empty();
        }
    }

    private Optional<JsonNode> findExactCompany(String body, String companyName) {
        try {
            JsonNode root = objectMapper.readTree(body);
            Queue<JsonNode> queue = new ArrayDeque<>();
            queue.add(root);
            while (!queue.isEmpty()) {
                JsonNode node = queue.remove();
                if (node.isObject()) {
                    Optional<String> name = firstText(node, NAME_FIELDS);
                    if (name.map(value -> normalize(value).equals(normalize(companyName))).orElse(false)) {
                        return Optional.of(node);
                    }
                    node.fields().forEachRemaining(entry -> queue.add(entry.getValue()));
                } else if (node.isArray()) {
                    node.forEach(queue::add);
                }
            }
        } catch (Exception ignored) {
            return Optional.empty();
        }
        return Optional.empty();
    }

    private RealtimeCompanyEnrichment toEnrichment(JsonNode node) {
        String homepage = firstText(node, HOMEPAGE_FIELDS).map(this::normalizeHomepage).orElse(null);
        String companyCategory = firstText(node, CATEGORY_FIELDS).orElse(null);
        return new RealtimeCompanyEnrichment(
            homepage == null ? null : domainFromUrl(homepage),
            companyCategory,
            companyCategory,
            firstText(node, INDUSTRY_FIELDS).orElse(null),
            companyCategory,
            null,
            null,
            firstText(node, BUSINESS_NUMBER_FIELDS).orElse(null),
            homepage,
            firstText(node, FOUNDED_FIELDS).flatMap(this::normalizeDate).orElse(null),
            firstText(node, CEO_FIELDS).orElse(null),
            firstText(node, EMPLOYEE_FIELDS).flatMap(this::parseInteger).orElse(null),
            firstText(node, BUSINESS_FIELDS).orElse(null),
            firstText(node, ADDRESS_FIELDS).orElse(null),
            SOURCE_TYPE,
            SOURCE_NAME,
            SOURCE_URL,
            SOURCE_NOTE,
            List.of(new RealtimeCompanyEnrichment.Source(SOURCE_TYPE, SOURCE_NAME, SOURCE_URL, SOURCE_NOTE))
        );
    }

    private Optional<String> firstText(JsonNode node, List<String> fields) {
        return fields.stream()
            .map(node::path)
            .filter(JsonNode::isValueNode)
            .map(JsonNode::asText)
            .map(String::trim)
            .filter(value -> !value.isBlank())
            .findFirst();
    }

    private Optional<Integer> parseInteger(String value) {
        try {
            return Optional.of(Integer.parseInt(value.replaceAll("[^0-9]", "")));
        } catch (NumberFormatException exception) {
            return Optional.empty();
        }
    }

    private Optional<String> normalizeDate(String value) {
        String digits = value.replaceAll("[^0-9]", "");
        if (digits.length() == 8) {
            return Optional.of("%s-%s-%s".formatted(digits.substring(0, 4), digits.substring(4, 6), digits.substring(6, 8)));
        }
        return Optional.empty();
    }

    private String normalizeHomepage(String value) {
        String trimmed = value.trim();
        return trimmed.startsWith("http://") || trimmed.startsWith("https://") ? trimmed : "https://" + trimmed;
    }

    private String domainFromUrl(String value) {
        try {
            String host = URI.create(normalizeHomepage(value)).getHost();
            if (!StringUtils.hasText(host)) {
                return null;
            }
            return host.startsWith("www.") ? host.substring(4) : host;
        } catch (IllegalArgumentException exception) {
            return null;
        }
    }

    private String normalize(String value) {
        return value == null ? "" : value.replaceAll("\\s+", "").toLowerCase(Locale.ROOT);
    }
}
