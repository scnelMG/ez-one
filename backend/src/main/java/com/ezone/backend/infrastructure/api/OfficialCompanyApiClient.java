package com.ezone.backend.infrastructure.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Year;
import java.util.ArrayDeque;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Queue;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

@Component
public class OfficialCompanyApiClient {

    private static final Logger log = LoggerFactory.getLogger(OfficialCompanyApiClient.class);

    private static final List<String> COMPANY_NAME_PARAMS = List.of(
        "companyName",
        "corpNm",
        "entrprsNm",
        "affiNm",
        "instNm",
        "orgNm"
    );

    private static final List<String> HOMEPAGE_FIELDS = List.of(
        "homepage",
        "hmpg",
        "hmpgUrl",
        "url",
        "homeUrl",
        "webUrl",
        "siteUrl"
    );

    private static final List<String> PUBLIC_INSTITUTION_NAME_FIELDS = List.of("instNm", "orgNm", "companyName");
    private static final List<String> PUBLIC_INSTITUTION_INDUSTRY_FIELDS = List.of("instClsfNm", "category", "industry");
    private static final List<String> PUBLIC_INSTITUTION_TYPE_FIELDS = List.of("instTypeNm", "instKndNm");
    private static final List<String> PUBLIC_INSTITUTION_ADDRESS_FIELDS = List.of("roadNmAddr", "addr", "address");
    private static final List<String> PUBLIC_INSTITUTION_DETAIL_ADDRESS_FIELDS = List.of("daddr", "detailAddr");
    private static final List<String> PUBLIC_INSTITUTION_FOUNDED_FIELDS = List.of("fndnYmd", "estbDe", "foundedAt");
    private static final List<String> PUBLIC_INSTITUTION_SUPERVISING_FIELDS = List.of("sprvsnInstNm", "supervisingMinistry");

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final String serviceKey;
    private final String publicInstitutionUrl;
    private final String largeEnterpriseAffiliateUrl;
    private final String middleMarketUrl;
    private final String largeEnterprisePresentnYear;
    private final int largeEnterpriseMaxPages;

    public OfficialCompanyApiClient(
        RestTemplate restTemplate,
        ObjectMapper objectMapper,
        @Value("${public-data.api.key:}") String serviceKey,
        @Value("${company-enrichment.public-institution.url:}") String publicInstitutionUrl,
        @Value("${company-enrichment.large-enterprise-affiliate.url:}") String largeEnterpriseAffiliateUrl,
        @Value("${company-enrichment.middle-market.url:}") String middleMarketUrl,
        @Value("${company-enrichment.large-enterprise-affiliate.presentn-year:}") String largeEnterprisePresentnYear,
        @Value("${company-enrichment.large-enterprise-affiliate.max-pages:50}") int largeEnterpriseMaxPages
    ) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
        this.serviceKey = serviceKey;
        this.publicInstitutionUrl = publicInstitutionUrl;
        this.largeEnterpriseAffiliateUrl = largeEnterpriseAffiliateUrl;
        this.middleMarketUrl = middleMarketUrl;
        this.largeEnterprisePresentnYear = largeEnterprisePresentnYear;
        this.largeEnterpriseMaxPages = largeEnterpriseMaxPages;
    }

    public Optional<OfficialCompanyMatch> findPublicInstitution(String companyName) {
        return request(publicInstitutionUrl, companyName)
            .map(body -> toPublicInstitutionMatch(body, companyName));
    }

    public Optional<OfficialCompanyMatch> findLargeEnterpriseAffiliate(String companyName) {
        return requestLargeEnterpriseAffiliate(companyName)
            .map(body -> toLargeEnterpriseMatch(body, companyName));
    }

    public Optional<OfficialCompanyMatch> findMiddleMarketCompany(String companyName) {
        return request(middleMarketUrl, companyName)
            .map(body -> toMatch(body, companyName, "MME_CONFIRMATION"));
    }

    private Optional<String> request(String endpoint, String companyName) {
        if (endpoint == null || endpoint.isBlank()) {
            return Optional.empty();
        }
        if (serviceKey == null || serviceKey.isBlank()) {
            log.info("PUBLIC_DATA_API_KEY is not configured; skipping realtime company enrichment.");
            return Optional.empty();
        }

        try {
            UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(endpoint)
                .queryParam("serviceKey", serviceKey)
                .queryParam("pageNo", 1)
                .queryParam("numOfRows", 100)
                .queryParam("resultType", "json")
                .queryParam("type", "json");
            COMPANY_NAME_PARAMS.forEach(param -> builder.queryParam(param, companyName));

            URI uri = builder.build(false).toUri();
            ResponseEntity<byte[]> response = restTemplate.getForEntity(uri, byte[].class);
            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                return Optional.empty();
            }

            String body = new String(response.getBody(), StandardCharsets.UTF_8);
            return containsCompanyName(body, companyName) ? Optional.of(body) : Optional.empty();
        } catch (IllegalArgumentException | RestClientException exception) {
            log.warn("Official company API request failed for {}: {}", companyName, exception.getMessage());
            return Optional.empty();
        }
    }

    private Optional<String> requestLargeEnterpriseAffiliate(String companyName) {
        if (largeEnterpriseAffiliateUrl == null || largeEnterpriseAffiliateUrl.isBlank()) {
            return Optional.empty();
        }
        if (serviceKey == null || serviceKey.isBlank()) {
            log.info("PUBLIC_DATA_API_KEY is not configured; skipping realtime company enrichment.");
            return Optional.empty();
        }

        String presentnYear = largeEnterprisePresentnYear == null || largeEnterprisePresentnYear.isBlank()
            ? String.valueOf(Year.now().getValue())
            : largeEnterprisePresentnYear;
        int maxPages = Math.max(1, largeEnterpriseMaxPages);

        for (int pageNo = 1; pageNo <= maxPages; pageNo++) {
            try {
                URI uri = UriComponentsBuilder.fromHttpUrl(largeEnterpriseAffiliateUrl)
                    .queryParam("serviceKey", serviceKey)
                    .queryParam("pageNo", pageNo)
                    .queryParam("numOfRows", 100)
                    .queryParam("presentnYear", presentnYear)
                    .build(false)
                    .toUri();
                ResponseEntity<byte[]> response = restTemplate.getForEntity(uri, byte[].class);
                if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                    return Optional.empty();
                }
                String body = new String(response.getBody(), StandardCharsets.UTF_8);
                if (!isSuccessResponse(body)) {
                    log.warn("FTC company group API returned non-success response for year {}.", presentnYear);
                    return Optional.empty();
                }
                if (containsCompanyName(body, companyName)) {
                    return Optional.of(body);
                }
                int totalCount = extractIntValue(body, "totalCount").orElse(0);
                int numOfRows = extractIntValue(body, "numOfRows").orElse(100);
                if (totalCount > 0 && pageNo * numOfRows >= totalCount) {
                    return Optional.empty();
                }
            } catch (IllegalArgumentException | RestClientException exception) {
                log.warn("FTC company group API request failed for {}: {}", companyName, exception.getMessage());
                return Optional.empty();
            }
        }
        return Optional.empty();
    }

    private OfficialCompanyMatch toMatch(String body, String companyName, String sourceType) {
        Optional<String> homepageUrl = extractHomepage(body);
        return new OfficialCompanyMatch(
            sourceType,
            homepageUrl.orElse(null),
            homepageUrl.map(this::domainFromUrl).orElse(null),
            null,
            null,
            null,
            null,
            null
        );
    }

    private OfficialCompanyMatch toPublicInstitutionMatch(String body, String companyName) {
        Optional<JsonNode> item = findJsonObjectByCompanyName(body, companyName, PUBLIC_INSTITUTION_NAME_FIELDS);
        Optional<String> homepageUrl = item
            .flatMap(node -> firstText(node, HOMEPAGE_FIELDS))
            .map(this::normalizeHomepage)
            .or(() -> extractHomepage(body));
        String institutionType = item.flatMap(node -> firstText(node, PUBLIC_INSTITUTION_TYPE_FIELDS)).orElse(null);
        String industry = item.flatMap(node -> firstText(node, PUBLIC_INSTITUTION_INDUSTRY_FIELDS)).orElse("공공");
        String ministry = item.flatMap(node -> firstText(node, PUBLIC_INSTITUTION_SUPERVISING_FIELDS)).orElse(null);
        String address = item.flatMap(this::publicInstitutionAddress).orElse(null);
        String foundedAt = item
            .flatMap(node -> firstText(node, PUBLIC_INSTITUTION_FOUNDED_FIELDS))
            .flatMap(this::normalizeDate)
            .orElse(null);
        String businessSummary = joinNonBlank(
            prefixed("기관유형", institutionType),
            prefixed("주무부처", ministry),
            prefixed("분야", industry)
        );

        return new OfficialCompanyMatch(
            "ALIO_PUBLIC_INSTITUTION",
            homepageUrl.orElse(null),
            homepageUrl.map(this::domainFromUrl).orElse(null),
            industry,
            foundedAt,
            null,
            businessSummary,
            address
        );
    }

    private OfficialCompanyMatch toLargeEnterpriseMatch(String body, String companyName) {
        String itemBody = findXmlItemContaining(body, "appnGroupAffi", companyName).orElse(body);
        String groupName = extractXmlValue(itemBody, "unityGrupNm").orElse(null);
        String representative = extractXmlValue(itemBody, "rprsntvNm").orElse(null);
        String foundedAt = extractXmlValue(itemBody, "fondDe")
            .flatMap(this::normalizeDate)
            .orElse(null);
        String businessSummary = joinNonBlank(prefixed("기업집단", groupName));

        return new OfficialCompanyMatch(
            "FTC_BUSINESS_GROUP",
            null,
            null,
            "대기업집단",
            foundedAt,
            representative,
            businessSummary,
            null
        );
    }

    private boolean containsCompanyName(String body, String companyName) {
        return normalize(body).contains(normalize(companyName));
    }

    private Optional<String> extractHomepage(String body) {
        Optional<String> jsonHomepage = extractHomepageFromJson(body);
        if (jsonHomepage.isPresent()) {
            return jsonHomepage;
        }
        return HOMEPAGE_FIELDS.stream()
            .flatMap(field -> List.of(
                extractXmlValue(body, field),
                extractJsonLikeValue(body, field)
            ).stream())
            .filter(Optional::isPresent)
            .map(Optional::get)
            .map(String::trim)
            .filter(value -> !value.isBlank())
            .findFirst()
            .map(this::normalizeHomepage);
    }

    private Optional<String> extractHomepageFromJson(String body) {
        try {
            JsonNode root = objectMapper.readTree(body);
            Queue<JsonNode> queue = new ArrayDeque<>();
            queue.add(root);
            while (!queue.isEmpty()) {
                JsonNode node = queue.remove();
                if (node.isObject()) {
                    node.fields().forEachRemaining(entry -> {
                        if (HOMEPAGE_FIELDS.stream().anyMatch(field -> field.equalsIgnoreCase(entry.getKey()))) {
                            queue.add(objectMapper.getNodeFactory().textNode(entry.getValue().asText()));
                        } else {
                            queue.add(entry.getValue());
                        }
                    });
                } else if (node.isArray()) {
                    node.forEach(queue::add);
                } else if (node.isTextual() && looksLikeUrl(node.asText())) {
                    return Optional.of(normalizeHomepage(node.asText()));
                }
            }
        } catch (Exception ignored) {
            return Optional.empty();
        }
        return Optional.empty();
    }

    private Optional<JsonNode> findJsonObjectByCompanyName(String body, String companyName, List<String> nameFields) {
        try {
            JsonNode root = objectMapper.readTree(body);
            Queue<JsonNode> queue = new ArrayDeque<>();
            queue.add(root);
            while (!queue.isEmpty()) {
                JsonNode node = queue.remove();
                if (node.isObject()) {
                    boolean matches = nameFields.stream()
                        .map(node::path)
                        .filter(JsonNode::isValueNode)
                        .map(JsonNode::asText)
                        .anyMatch(value -> normalize(value).contains(normalize(companyName)));
                    if (matches) {
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

    private Optional<String> firstText(JsonNode node, List<String> fieldNames) {
        return fieldNames.stream()
            .map(node::path)
            .filter(JsonNode::isValueNode)
            .map(JsonNode::asText)
            .map(String::trim)
            .filter(value -> !value.isBlank())
            .findFirst();
    }

    private Optional<String> publicInstitutionAddress(JsonNode node) {
        String roadAddress = firstText(node, PUBLIC_INSTITUTION_ADDRESS_FIELDS).orElse("");
        String detailAddress = firstText(node, PUBLIC_INSTITUTION_DETAIL_ADDRESS_FIELDS).orElse("");
        if (detailAddress.equals(roadAddress) || normalize(detailAddress).equals(normalize(roadAddress))) {
            detailAddress = "";
        }
        String address = joinNonBlank(roadAddress, detailAddress);
        return address.isBlank() ? Optional.empty() : Optional.of(address);
    }

    private Optional<String> extractXmlValue(String body, String fieldName) {
        String opening = "<" + fieldName + ">";
        String closing = "</" + fieldName + ">";
        int start = body.indexOf(opening);
        int end = body.indexOf(closing);
        if (start < 0 || end <= start) {
            return Optional.empty();
        }
        return Optional.of(body.substring(start + opening.length(), end));
    }

    private Optional<String> findXmlItemContaining(String body, String itemName, String companyName) {
        String opening = "<" + itemName + ">";
        String closing = "</" + itemName + ">";
        int searchFrom = 0;
        while (searchFrom >= 0) {
            int start = body.indexOf(opening, searchFrom);
            if (start < 0) {
                return Optional.empty();
            }
            int end = body.indexOf(closing, start + opening.length());
            if (end < 0) {
                return Optional.empty();
            }
            String item = body.substring(start, end + closing.length());
            if (containsCompanyName(item, companyName)) {
                return Optional.of(item);
            }
            searchFrom = end + closing.length();
        }
        return Optional.empty();
    }

    private boolean isSuccessResponse(String body) {
        return body == null || !body.contains("<resultCode>") || body.contains("<resultCode>00</resultCode>");
    }

    private Optional<Integer> extractIntValue(String body, String fieldName) {
        return extractXmlValue(body, fieldName)
            .flatMap(value -> {
                try {
                    return Optional.of(Integer.parseInt(value.trim()));
                } catch (NumberFormatException exception) {
                    return Optional.empty();
                }
            });
    }

    private Optional<String> extractJsonLikeValue(String body, String fieldName) {
        String needle = "\"" + fieldName + "\"";
        int keyIndex = body.indexOf(needle);
        if (keyIndex < 0) {
            return Optional.empty();
        }
        int colonIndex = body.indexOf(':', keyIndex + needle.length());
        int valueStart = body.indexOf('"', colonIndex + 1);
        int valueEnd = body.indexOf('"', valueStart + 1);
        if (colonIndex < 0 || valueStart < 0 || valueEnd <= valueStart) {
            return Optional.empty();
        }
        return Optional.of(body.substring(valueStart + 1, valueEnd));
    }

    private boolean looksLikeUrl(String value) {
        String normalized = value.toLowerCase(Locale.ROOT);
        return normalized.startsWith("http://")
            || normalized.startsWith("https://")
            || normalized.startsWith("www.");
    }

    private String normalizeHomepage(String homepageUrl) {
        String trimmed = homepageUrl.trim();
        if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
            return trimmed;
        }
        return "https://" + trimmed;
    }

    private Optional<String> normalizeDate(String value) {
        String digits = String.valueOf(value).replaceAll("[^0-9]", "");
        if (digits.length() == 8) {
            return Optional.of("%s-%s-%s".formatted(digits.substring(0, 4), digits.substring(4, 6), digits.substring(6, 8)));
        }
        if (digits.length() == 6) {
            return Optional.of("%s-%s-01".formatted(digits.substring(0, 4), digits.substring(4, 6)));
        }
        if (digits.length() == 4) {
            return Optional.of("%s-01-01".formatted(digits));
        }
        return Optional.empty();
    }

    private String prefixed(String label, String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        return label + ": " + value.trim();
    }

    private String joinNonBlank(String... values) {
        return Arrays.stream(values)
            .map(value -> value == null ? "" : value.trim())
            .filter(value -> !value.isBlank())
            .reduce((left, right) -> left + " · " + right)
            .orElse("");
    }

    private String domainFromUrl(String homepageUrl) {
        try {
            URI uri = URI.create(normalizeHomepage(homepageUrl));
            String host = uri.getHost();
            if (host == null || host.isBlank()) {
                return fallbackDomain(homepageUrl);
            }
            return host.startsWith("www.") ? host.substring(4) : host;
        } catch (IllegalArgumentException exception) {
            return fallbackDomain(homepageUrl);
        }
    }

    private String fallbackDomain(String value) {
        return normalize(value)
            .replaceAll("[^a-z0-9]+", "-")
            .replaceAll("(^-+|-+$)", "")
            + ".official";
    }

    private String normalize(String value) {
        if (value == null) {
            return "";
        }
        return value.replaceAll("\\s+", "").toLowerCase(Locale.ROOT);
    }

    public record OfficialCompanyMatch(
        String sourceType,
        String homepageUrl,
        String domain,
        String industry,
        String foundedAt,
        String representative,
        String businessSummary,
        String address
    ) {
    }
}
