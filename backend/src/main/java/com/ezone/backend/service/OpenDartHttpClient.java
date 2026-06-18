package com.ezone.backend.service;

import com.ezone.backend.dto.dart.DartDisclosureResponse;
import com.fasterxml.jackson.databind.JsonNode;
import java.io.ByteArrayInputStream;
import java.io.StringReader;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import org.w3c.dom.Document;
import org.w3c.dom.NodeList;
import org.xml.sax.InputSource;

@Service
public class OpenDartHttpClient implements OpenDartClient {

    private static final String BASE_URL = "https://opendart.fss.or.kr/api";
    private static final int DOCUMENT_TEXT_LIMIT = 60000;

    private final RestTemplate restTemplate;
    private final String apiKey;
    private volatile Map<String, CorpCode> corpCodeCache;

    public OpenDartHttpClient(
        RestTemplate restTemplate,
        @Value("${opendart.api-key:}") String apiKey
    ) {
        this.restTemplate = restTemplate;
        this.apiKey = apiKey;
    }

    @Override
    public List<DartDisclosureResponse> listPeriodicDisclosures(String companyName) {
        if (!StringUtils.hasText(apiKey) || !StringUtils.hasText(companyName)) {
            return List.of();
        }
        String corpCode = findCorpCode(companyName);
        if (!StringUtils.hasText(corpCode)) {
            return List.of();
        }
        String today = LocalDate.now(ZoneId.of("Asia/Seoul")).format(DateTimeFormatter.BASIC_ISO_DATE);
        String threeYearsAgo = LocalDate.now(ZoneId.of("Asia/Seoul"))
            .minusYears(3)
            .format(DateTimeFormatter.BASIC_ISO_DATE);
        String uri = UriComponentsBuilder.fromHttpUrl(BASE_URL + "/list.json")
            .queryParam("crtfc_key", apiKey)
            .queryParam("corp_code", corpCode)
            .queryParam("bgn_de", threeYearsAgo)
            .queryParam("end_de", today)
            .queryParam("pblntf_ty", "A")
            .queryParam("last_reprt_at", "Y")
            .queryParam("page_count", 20)
            .toUriString();
        JsonNode root = restTemplate.getForObject(uri, JsonNode.class);
        if (root == null || !"000".equals(root.path("status").asText())) {
            return List.of();
        }
        List<DartDisclosureResponse> disclosures = new ArrayList<>();
        for (JsonNode row : root.path("list")) {
            String reportName = row.path("report_nm").asText("");
            if (!isPeriodicReport(reportName)) {
                continue;
            }
            String rceptNo = row.path("rcept_no").asText("");
            disclosures.add(new DartDisclosureResponse(
                rceptNo,
                reportName,
                row.path("pblntf_detail_ty").asText("A"),
                row.path("rcept_dt").asText(""),
                row.path("corp_name").asText(companyName),
                reportName.contains("사업보고서"),
                "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=" + rceptNo
            ));
        }
        return disclosures;
    }

    @Override
    public String downloadDocumentText(String rceptNo) {
        if (!StringUtils.hasText(apiKey) || !StringUtils.hasText(rceptNo)) {
            return "";
        }
        String uri = UriComponentsBuilder.fromHttpUrl(BASE_URL + "/document.xml")
            .queryParam("crtfc_key", apiKey)
            .queryParam("rcept_no", rceptNo)
            .toUriString();
        byte[] zipped = restTemplate.getForObject(uri, byte[].class);
        if (zipped == null || zipped.length == 0) {
            return "";
        }
        return extractDocumentText(zipped);
    }

    private String findCorpCode(String companyName) {
        Map<String, CorpCode> corpCodes = getCorpCodes();
        String normalized = normalizeCompanyName(companyName);
        CorpCode exact = corpCodes.get(normalized);
        if (exact != null) {
            return exact.corpCode();
        }
        return corpCodes.values().stream()
            .filter(row -> normalizeCompanyName(row.corpName()).contains(normalized))
            .map(CorpCode::corpCode)
            .findFirst()
            .orElse("");
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
        String uri = UriComponentsBuilder.fromHttpUrl(BASE_URL + "/corpCode.xml")
            .queryParam("crtfc_key", apiKey)
            .toUriString();
        byte[] zipped = restTemplate.getForObject(uri, byte[].class);
        if (zipped == null || zipped.length == 0) {
            return Map.of();
        }
        String xml = extractFirstZipEntry(zipped);
        if (!StringUtils.hasText(xml)) {
            return Map.of();
        }
        try {
            Document document = documentBuilderFactory().newDocumentBuilder().parse(new InputSource(new StringReader(xml)));
            NodeList rows = document.getElementsByTagName("list");
            Map<String, CorpCode> corpCodes = new HashMap<>();
            for (int index = 0; index < rows.getLength(); index += 1) {
                String corpCode = rows.item(index).getChildNodes().getLength() == 0
                    ? ""
                    : textOf(rows.item(index), "corp_code");
                String corpName = textOf(rows.item(index), "corp_name");
                if (StringUtils.hasText(corpCode) && StringUtils.hasText(corpName)) {
                    corpCodes.put(normalizeCompanyName(corpName), new CorpCode(corpCode, corpName));
                }
            }
            return corpCodes;
        } catch (Exception exception) {
            return Map.of();
        }
    }

    private String extractDocumentText(byte[] zipped) {
        String xml = extractFirstZipEntry(zipped);
        if (!StringUtils.hasText(xml)) {
            return "";
        }
        String text = xml
            .replaceAll("(?s)<STYLE.*?</STYLE>", " ")
            .replaceAll("(?s)<[^>]+>", " ")
            .replace("&nbsp;", " ")
            .replaceAll("\\s+", " ")
            .trim();
        return text.length() > DOCUMENT_TEXT_LIMIT ? text.substring(0, DOCUMENT_TEXT_LIMIT) : text;
    }

    private String extractFirstZipEntry(byte[] zipped) {
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

    private boolean isPeriodicReport(String reportName) {
        return reportName.contains("사업보고서")
            || reportName.contains("반기보고서")
            || reportName.contains("분기보고서");
    }

    private static String normalizeCompanyName(String value) {
        return value == null ? "" : value.replaceAll("\\s+", "").toLowerCase(Locale.ROOT);
    }

    private static String textOf(org.w3c.dom.Node parent, String tagName) {
        NodeList matches = ((org.w3c.dom.Element) parent).getElementsByTagName(tagName);
        if (matches.getLength() == 0) {
            return "";
        }
        return matches.item(0).getTextContent();
    }

    private static DocumentBuilderFactory documentBuilderFactory() throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        factory.setExpandEntityReferences(false);
        return factory;
    }

    private record CorpCode(
        String corpCode,
        String corpName
    ) {
    }
}
