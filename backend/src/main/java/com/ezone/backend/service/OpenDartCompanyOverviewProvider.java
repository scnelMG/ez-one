package com.ezone.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import java.io.ByteArrayInputStream;
import java.io.StringReader;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import org.w3c.dom.NodeList;
import org.xml.sax.InputSource;

@Component
@Order(20)
class OpenDartCompanyOverviewProvider implements RealtimeCompanyEnrichmentProvider {

    private static final String SOURCE_TYPE = "OPENDART_COMPANY_OVERVIEW";
    private static final String SOURCE_NAME = "OpenDART 기업개황";
    private static final String SOURCE_NOTE = "OpenDART 기업개황 기준";

    private final RestTemplate restTemplate;
    private final String apiKey;
    private final String apiBaseUrl;
    private final String sourceUrl;
    private volatile Map<String, CorpCode> corpCodeCache;

    @Autowired
    OpenDartCompanyOverviewProvider(
        RestTemplate restTemplate,
        @Value("${opendart.api-key:}") String apiKey,
        @Value("${opendart.api-base-url}") String apiBaseUrl,
        @Value("${opendart.company-overview-source-url}") String sourceUrl
    ) {
        this.restTemplate = restTemplate;
        this.apiKey = apiKey;
        this.apiBaseUrl = trimTrailingSlash(apiBaseUrl);
        this.sourceUrl = StringUtils.hasText(sourceUrl) ? sourceUrl.trim() : "";
    }

    OpenDartCompanyOverviewProvider(RestTemplate restTemplate, String apiKey) {
        this(restTemplate, apiKey, "", "");
    }

    @Override
    public Optional<RealtimeCompanyEnrichment> enrich(String companyName) {
        if (!StringUtils.hasText(apiKey) || !StringUtils.hasText(companyName)) {
            return Optional.empty();
        }
        return findCorpCode(companyName).flatMap(this::requestCompanyOverview);
    }

    private Optional<RealtimeCompanyEnrichment> requestCompanyOverview(CorpCode corpCode) {
        try {
            String uri = UriComponentsBuilder.fromUriString(apiBaseUrl + "/company.json")
                .queryParam("crtfc_key", apiKey)
                .queryParam("corp_code", corpCode.corpCode())
                .toUriString();
            JsonNode root = restTemplate.getForObject(uri, JsonNode.class);
            if (root == null || !"000".equals(root.path("status").asText())) {
                return Optional.empty();
            }
            String homepage = normalizeHomepage(root.path("hm_url").asText(""));
            return Optional.of(new RealtimeCompanyEnrichment(
                domainFromUrl(homepage),
                corpClassLabel(root.path("corp_cls").asText("")),
                corpClassLabel(root.path("corp_cls").asText("")),
                industryLabel(root.path("induty_code").asText("")),
                corpClassLabel(root.path("corp_cls").asText("")),
                root.path("corp_code").asText(corpCode.corpCode()),
                root.path("stock_code").asText(corpCode.stockCode()),
                null,
                homepage,
                normalizeDate(root.path("est_dt").asText("")).orElse(null),
                emptyToNull(root.path("ceo_nm").asText("")),
                null,
                null,
                emptyToNull(root.path("corp_addr").asText("")),
                SOURCE_TYPE,
                SOURCE_NAME,
                sourceUrl,
                SOURCE_NOTE,
                List.of(new RealtimeCompanyEnrichment.Source(SOURCE_TYPE, SOURCE_NAME, sourceUrl, SOURCE_NOTE))
            ));
        } catch (IllegalArgumentException | RestClientException exception) {
            return Optional.empty();
        }
    }

    private Optional<CorpCode> findCorpCode(String companyName) {
        Map<String, CorpCode> corpCodes = getCorpCodes();
        String normalized = normalize(companyName);
        CorpCode exact = corpCodes.get(normalized);
        if (exact != null) {
            return Optional.of(exact);
        }
        return corpCodes.values().stream()
            .filter(row -> {
                String dartName = normalize(row.corpName());
                return dartName.contains(normalized) || normalized.contains(dartName);
            })
            .max(Comparator.comparingInt(row -> normalize(row.corpName()).length()));
    }

    private Map<String, CorpCode> getCorpCodes() {
        Map<String, CorpCode> cached = corpCodeCache;
        if (cached != null) {
            return cached;
        }
        synchronized (this) {
            if (corpCodeCache == null) {
                corpCodeCache = loadCorpCodes();
            }
            return corpCodeCache;
        }
    }

    private Map<String, CorpCode> loadCorpCodes() {
        try {
            String uri = UriComponentsBuilder.fromUriString(apiBaseUrl + "/corpCode.xml")
                .queryParam("crtfc_key", apiKey)
                .toUriString();
            byte[] zipped = restTemplate.getForObject(uri, byte[].class);
            String xml = extractFirstZipEntry(zipped);
            if (!StringUtils.hasText(xml)) {
                return Map.of();
            }
            org.w3c.dom.Document document = documentBuilderFactory().newDocumentBuilder().parse(new InputSource(new StringReader(xml)));
            NodeList rows = document.getElementsByTagName("list");
            Map<String, CorpCode> corpCodes = new HashMap<>();
            for (int index = 0; index < rows.getLength(); index += 1) {
                String corpCode = textOf(rows.item(index), "corp_code");
                String corpName = textOf(rows.item(index), "corp_name");
                String stockCode = textOf(rows.item(index), "stock_code");
                if (StringUtils.hasText(corpCode) && StringUtils.hasText(corpName)) {
                    corpCodes.put(normalize(corpName), new CorpCode(corpCode, corpName, stockCode));
                }
            }
            return corpCodes;
        } catch (Exception exception) {
            return Map.of();
        }
    }

    private String extractFirstZipEntry(byte[] zipped) {
        if (zipped == null || zipped.length == 0) {
            return "";
        }
        try (ZipInputStream zipInputStream = new ZipInputStream(new ByteArrayInputStream(zipped))) {
            ZipEntry entry = zipInputStream.getNextEntry();
            if (entry == null) {
                return "";
            }
            return new String(zipInputStream.readAllBytes(), StandardCharsets.UTF_8);
        } catch (Exception exception) {
            return "";
        }
    }

    private String corpClassLabel(String value) {
        return switch (value) {
            case "Y" -> "유가증권시장";
            case "K" -> "코스닥";
            case "N" -> "코넥스";
            case "E" -> "기타법인";
            default -> null;
        };
    }

    private String industryLabel(String value) {
        return StringUtils.hasText(value) ? "업종코드 " + value : null;
    }

    private String normalizeHomepage(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        String trimmed = value.trim();
        return hasHttpScheme(trimmed) ? trimmed : "https:" + "//" + trimmed;
    }

    private String domainFromUrl(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
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

    private Optional<String> normalizeDate(String value) {
        String digits = String.valueOf(value).replaceAll("[^0-9]", "");
        if (digits.length() == 8) {
            return Optional.of("%s-%s-%s".formatted(digits.substring(0, 4), digits.substring(4, 6), digits.substring(6, 8)));
        }
        return Optional.empty();
    }

    private String emptyToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private String normalize(String value) {
        return value == null ? "" : value.replaceAll("\\s+", "").toLowerCase(Locale.ROOT);
    }

    private boolean hasHttpScheme(String value) {
        try {
            String scheme = URI.create(value).getScheme();
            return "http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme);
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    private String trimTrailingSlash(String value) {
        if (!StringUtils.hasText(value)) {
            return "";
        }
        String trimmed = value.trim();
        while (trimmed.endsWith("/")) {
            trimmed = trimmed.substring(0, trimmed.length() - 1);
        }
        return trimmed;
    }

    private static String textOf(org.w3c.dom.Node parent, String tagName) {
        NodeList matches = ((org.w3c.dom.Element) parent).getElementsByTagName(tagName);
        return matches.getLength() == 0 ? "" : matches.item(0).getTextContent();
    }

    private static DocumentBuilderFactory documentBuilderFactory() throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        factory.setExpandEntityReferences(false);
        return factory;
    }

    private record CorpCode(String corpCode, String corpName, String stockCode) {
    }
}
