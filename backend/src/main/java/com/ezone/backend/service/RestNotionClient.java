package com.ezone.backend.service;

import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

@Component
@EnableConfigurationProperties(NotionProperties.class)
public class RestNotionClient implements NotionClient {

    private final RestTemplate restTemplate;
    private final NotionProperties properties;
    private static final String JOBS_ROOT_PAGE_TITLE = "취업 준비";
    private static final Pattern KOREAN_DATE_PATTERN = Pattern.compile("^(\\d{4})\\.(\\d{2})\\.(\\d{2})$");
    private static final Pattern KOREAN_DISPLAY_DATE_PATTERN = Pattern.compile("^(\\d{4})년\\s*(\\d{1,2})월\\s*(\\d{1,2})일(?:\\s+\\d{1,2}:\\d{2})?.*$");

    public RestNotionClient(RestTemplate restTemplate, NotionProperties properties) {
        this.restTemplate = restTemplate;
        this.properties = properties;
    }

    @Override
    public NotionOAuthToken exchangeAuthorizationCode(String authorizationCode, String redirectUri) {
        requireServerOAuthConfig();

        HttpHeaders headers = jsonHeaders();
        headers.setBasicAuth(properties.clientId(), properties.clientSecret(), StandardCharsets.UTF_8);
        headers.set("Notion-Version", properties.resolvedVersion());

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("grant_type", "authorization_code");
        body.put("code", authorizationCode);
        if (redirectUri != null && !redirectUri.isBlank()) {
            body.put("redirect_uri", redirectUri);
        }

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.postForObject(
                properties.resolvedTokenUri(),
                new HttpEntity<>(body, headers),
                Map.class
            );
            if (response == null || response.get("access_token") == null) {
                throw new NotionClientException("Notion OAuth response did not include an access token.");
            }
            return new NotionOAuthToken(
                response.get("access_token").toString(),
                stringValue(response.get("workspace_id")),
                stringValue(response.get("bot_id")),
                ownerEmail(response.get("owner"))
            );
        } catch (RestClientException exception) {
            throw new NotionClientException("Notion OAuth token exchange failed.", exception);
        }
    }

    @Override
    public NotionDatabaseResult createJobsDatabase(String accessToken) {
        HttpHeaders headers = notionJsonHeaders(accessToken);

        Map<String, Object> pageBody = new LinkedHashMap<>();
        pageBody.put("parent", Map.of("type", "workspace", "workspace", true));
        pageBody.put("properties", Map.of(
            "title",
            Map.of("title", List.of(richText(JOBS_ROOT_PAGE_TITLE)))
        ));

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> rootPage = restTemplate.postForObject(
                properties.resolvedPagesUri(),
                new HttpEntity<>(pageBody, headers),
                Map.class
            );
            if (rootPage == null || rootPage.get("id") == null) {
                throw new NotionClientException("Notion root page response did not include a page id.");
            }

            String rootPageId = rootPage.get("id").toString();
            Map<String, Object> databaseBody = new LinkedHashMap<>();
            databaseBody.put("parent", Map.of("type", "page_id", "page_id", rootPageId));
            databaseBody.put("title", List.of(richText("EZ-ONE 공고 장바구니")));
            databaseBody.put("properties", jobDatabaseProperties());

            @SuppressWarnings("unchecked")
            Map<String, Object> database = restTemplate.postForObject(
                properties.resolvedDatabasesUri(),
                new HttpEntity<>(databaseBody, headers),
                Map.class
            );
            if (database == null || database.get("id") == null) {
                throw new NotionClientException("Notion database response did not include a database id.");
            }
            String databaseId = database.get("id").toString();
            return new NotionDatabaseResult(rootPageId, databaseId, dataSourceId(database, databaseId));
        } catch (RestClientException exception) {
            throw new NotionClientException("Notion jobs database creation failed.", exception);
        }
    }

    @Override
    public void ensureJobsRootPageTitle(String accessToken, String rootPageId) {
        if (rootPageId == null || rootPageId.isBlank()) {
            return;
        }
        HttpHeaders headers = notionJsonHeaders(accessToken);
        try {
            restTemplate.exchange(
                properties.resolvedPagesUri() + "/" + rootPageId,
                HttpMethod.PATCH,
                new HttpEntity<>(Map.of(
                    "properties",
                    Map.of("title", Map.of("title", List.of(richText(JOBS_ROOT_PAGE_TITLE))))
                ), headers),
                Map.class
            );
        } catch (RestClientException exception) {
            throw new NotionClientException("Notion root page title update failed. " + notionErrorMessage(exception, exception), exception);
        }
    }

    @Override
    public void ensureJobsDatabaseSchema(String accessToken, String databaseId) {
        if (databaseId == null || databaseId.isBlank()) {
            throw new NotionClientException("Notion jobs database is not configured.");
        }
        HttpHeaders headers = notionJsonHeaders(accessToken);
        try {
            renameLegacyJobDatabaseProperties(headers, databaseId);
            restTemplate.exchange(
                properties.resolvedDatabasesUri() + "/" + databaseId,
                HttpMethod.PATCH,
                new HttpEntity<>(Map.of("properties", jobDatabaseProperties()), headers),
                Map.class
            );
        } catch (RestClientException exception) {
            throw new NotionClientException("Notion jobs database schema update failed. " + notionErrorMessage(exception, exception), exception);
        }
    }

    @Override
    public NotionPageResult createJobPage(String accessToken, String dataSourceId, NotionJobPageRequest request) {
        HttpHeaders headers = notionJsonHeaders(accessToken);

        try {
            return postJobPage(headers, dataSourceParent(dataSourceId), request);
        } catch (RestClientException dataSourceException) {
            try {
                return postJobPage(headers, databaseParent(dataSourceId), request);
            } catch (RestClientException databaseException) {
                throw new NotionClientException(
                    "Notion page creation failed. " + notionErrorMessage(databaseException, dataSourceException),
                    databaseException
                );
            }
        }
    }

    @Override
    public NotionPageResult updateJobPage(String accessToken, String pageId, NotionJobPageRequest request) {
        HttpHeaders headers = notionJsonHeaders(accessToken);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("properties", jobPageProperties(request));

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.exchange(
                properties.resolvedPagesUri() + "/" + pageId,
                HttpMethod.PATCH,
                new HttpEntity<>(body, headers),
                Map.class
            ).getBody();
            if (response == null || response.get("id") == null) {
                throw new NotionClientException("Notion page update response did not include a page id.");
            }
            return new NotionPageResult(response.get("id").toString(), stringValue(response.get("url")));
        } catch (RestClientException exception) {
            throw new NotionClientException("Notion page update failed. " + notionErrorMessage(exception, exception), exception);
        }
    }

    private void requireServerOAuthConfig() {
        if (properties.clientId() == null || properties.clientId().isBlank()
            || properties.clientSecret() == null || properties.clientSecret().isBlank()) {
            throw new NotionClientException("Notion OAuth server credentials are not configured.");
        }
    }

    private HttpHeaders notionJsonHeaders(String accessToken) {
        HttpHeaders headers = jsonHeaders();
        headers.setBearerAuth(accessToken);
        headers.set("Notion-Version", properties.resolvedVersion());
        return headers;
    }

    private HttpHeaders jsonHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        return headers;
    }

    private Map<String, Object> jobDatabaseProperties() {
        Map<String, Object> databaseProperties = new LinkedHashMap<>();
        databaseProperties.put("직무", Map.of("title", Map.of()));
        databaseProperties.put("회사명", Map.of("rich_text", Map.of()));
        databaseProperties.put("상태", Map.of("select", Map.of(
            "options", List.of(
                Map.of("name", "지원 전", "color", "gray"),
                Map.of("name", "진행 중", "color", "yellow"),
                Map.of("name", "지원완료", "color", "green"),
                Map.of("name", "미지원", "color", "brown")
            )
        )));
        databaseProperties.put("마감일", Map.of("date", Map.of()));
        databaseProperties.put("마감 표시", Map.of("rich_text", Map.of()));
        databaseProperties.put("마감 임박", Map.of("checkbox", Map.of()));
        databaseProperties.put("바로가기", Map.of("url", Map.of()));
        databaseProperties.put("회사 로고", Map.of("files", Map.of()));
        databaseProperties.put("메모", Map.of("rich_text", Map.of()));
        databaseProperties.put("공고 ID", Map.of("number", Map.of("format", "number")));
        databaseProperties.put("워크스페이스 ID", Map.of("number", Map.of("format", "number")));
        databaseProperties.put("동기화 범위", Map.of("select", Map.of(
            "options", List.of(Map.of("name", "JOB_ONLY", "color", "blue"))
        )));
        return databaseProperties;
    }

    private void renameLegacyJobDatabaseProperties(HttpHeaders headers, String databaseId) {
        Map<String, Object> legacyProperties = new LinkedHashMap<>();
        legacyProperties.put("Job", Map.of("name", "직무"));
        legacyProperties.put("Company", Map.of("name", "회사명"));
        legacyProperties.put("Status", Map.of("name", "상태"));
        legacyProperties.put("Status Label", Map.of("name", "상태 표시"));
        legacyProperties.put("Deadline", Map.of("name", "마감 표시"));
        legacyProperties.put("Deadline Date", Map.of("name", "마감일"));
        legacyProperties.put("Deadline Soon", Map.of("name", "마감 임박"));
        legacyProperties.put("Job URL", Map.of("name", "바로가기"));
        legacyProperties.put("Company Logo", Map.of("name", "회사 로고"));
        legacyProperties.put("Memo", Map.of("name", "메모"));
        legacyProperties.put("Basket Job ID", Map.of("name", "공고 ID"));
        legacyProperties.put("Workspace ID", Map.of("name", "워크스페이스 ID"));
        legacyProperties.put("Sync Scope", Map.of("name", "동기화 범위"));

        for (Map.Entry<String, Object> legacyProperty : legacyProperties.entrySet()) {
            try {
                restTemplate.exchange(
                    properties.resolvedDatabasesUri() + "/" + databaseId,
                    HttpMethod.PATCH,
                    new HttpEntity<>(Map.of("properties", Map.of(legacyProperty.getKey(), legacyProperty.getValue())), headers),
                    Map.class
                );
            } catch (RestClientException ignored) {
                // Korean databases do not have every legacy English property name.
            }
        }
    }

    private Map<String, Object> jobPageProperties(NotionJobPageRequest request) {
        Map<String, Object> pageProperties = new LinkedHashMap<>();
        pageProperties.put("직무", Map.of("title", List.of(richText(nullToEmpty(request.positionTitle())))));
        pageProperties.put("회사명", Map.of("rich_text", List.of(richText(nullToEmpty(request.companyName())))));
        pageProperties.put("상태", Map.of("select", Map.of("name", statusLabel(request))));
        pageProperties.put("마감일", dateProperty(request.deadlineDate()));
        pageProperties.put("마감 표시", Map.of("rich_text", List.of(richText(nullToEmpty(request.deadlineLabel())))));
        pageProperties.put("마감 임박", Map.of("checkbox", request.deadlineSoon()));
        Map<String, Object> url = new LinkedHashMap<>();
        url.put("url", blankToNull(request.sourceUrl()));
        pageProperties.put("바로가기", url);
        pageProperties.put("회사 로고", filesProperty(request.companyLogoUrl(), request.companyName()));
        pageProperties.put("메모", Map.of("rich_text", List.of(richText(nullToEmpty(request.applicationMemo())))));
        pageProperties.put("공고 ID", Map.of("number", request.basketJobId()));
        pageProperties.put("워크스페이스 ID", Map.of("number", request.workspaceId()));
        pageProperties.put("동기화 범위", Map.of("select", Map.of("name", request.syncScope().name())));
        return pageProperties;
    }

    private NotionPageResult postJobPage(HttpHeaders headers, Map<String, Object> parent, NotionJobPageRequest request) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("parent", parent);
        body.put("properties", jobPageProperties(request));

        @SuppressWarnings("unchecked")
        Map<String, Object> response = restTemplate.postForObject(
            properties.resolvedPagesUri(),
            new HttpEntity<>(body, headers),
            Map.class
        );
        if (response == null || response.get("id") == null) {
            throw new NotionClientException("Notion page response did not include a page id.");
        }
        return new NotionPageResult(response.get("id").toString(), stringValue(response.get("url")));
    }

    private Map<String, Object> dataSourceParent(String dataSourceId) {
        return Map.of("type", "data_source_id", "data_source_id", dataSourceId);
    }

    private Map<String, Object> databaseParent(String databaseId) {
        return Map.of("type", "database_id", "database_id", databaseId);
    }

    private String notionErrorMessage(RestClientException primary, RestClientException fallback) {
        String primaryMessage = responseBody(primary);
        if (primaryMessage != null) {
            return primaryMessage;
        }
        String fallbackMessage = responseBody(fallback);
        if (fallbackMessage != null) {
            return fallbackMessage;
        }
        return primary.getMessage() == null ? "" : primary.getMessage();
    }

    private String responseBody(RestClientException exception) {
        if (exception instanceof HttpStatusCodeException statusException) {
            String body = statusException.getResponseBodyAsString();
            if (body != null && !body.isBlank()) {
                return body;
            }
        }
        return null;
    }

    private Map<String, Object> richText(String text) {
        return Map.of(
            "type", "text",
            "text", Map.of("content", text == null ? "" : text)
        );
    }

    private Map<String, Object> dateProperty(String date) {
        String normalizedDate = normalizeDate(date);
        Map<String, Object> dateValue = new LinkedHashMap<>();
        if (normalizedDate == null) {
            dateValue.put("date", null);
        } else {
            dateValue.put("date", Map.of("start", normalizedDate));
        }
        return dateValue;
    }

    private Map<String, Object> filesProperty(String logoUrl, String companyName) {
        if (logoUrl == null || logoUrl.isBlank() || !(logoUrl.startsWith("http://") || logoUrl.startsWith("https://"))) {
            return Map.of("files", List.of());
        }
        return Map.of("files", List.of(Map.of(
            "name", nullToEmpty(companyName).isBlank() ? "Company Logo" : nullToEmpty(companyName) + " Logo",
            "type", "external",
            "external", Map.of("url", logoUrl)
        )));
    }

    private String statusLabel(NotionJobPageRequest request) {
        String normalized = switch (nullToEmpty(request.applicationStatus())) {
            case "READY" -> "지원 전";
            case "IN_PROGRESS" -> "진행 중";
            case "COMPLETED" -> "지원완료";
            case "NOT_APPLIED" -> "미지원";
            default -> null;
        };
        if (normalized != null) {
            return normalized;
        }
        return request.statusLabel() == null || request.statusLabel().isBlank() ? "지원 전" : request.statusLabel();
    }

    private String normalizeDate(String date) {
        if (date == null || date.isBlank()) {
            return null;
        }
        if (date.matches("^\\d{4}-\\d{2}-\\d{2}$")) {
            return date;
        }
        java.util.regex.Matcher matcher = KOREAN_DATE_PATTERN.matcher(date);
        if (matcher.matches()) {
            return "%s-%s-%s".formatted(matcher.group(1), matcher.group(2), matcher.group(3));
        }
        java.util.regex.Matcher displayMatcher = KOREAN_DISPLAY_DATE_PATTERN.matcher(date);
        if (displayMatcher.matches()) {
            return "%s-%02d-%02d".formatted(
                displayMatcher.group(1),
                Integer.parseInt(displayMatcher.group(2)),
                Integer.parseInt(displayMatcher.group(3))
            );
        }
        return null;
    }

    @SuppressWarnings("unchecked")
    private String ownerEmail(Object owner) {
        if (!(owner instanceof Map<?, ?> ownerMap)) {
            return null;
        }
        Object user = ownerMap.get("user");
        if (!(user instanceof Map<?, ?> userMap)) {
            return null;
        }
        Object person = userMap.get("person");
        if (person instanceof Map<?, ?> personMap && personMap.get("email") != null) {
            return personMap.get("email").toString();
        }
        return stringValue(userMap.get("name"));
    }

    private String dataSourceId(Map<String, Object> database, String fallbackDatabaseId) {
        Object initialDataSource = database.get("initial_data_source");
        if (initialDataSource instanceof Map<?, ?> initialMap && initialMap.get("id") != null) {
            return initialMap.get("id").toString();
        }
        Object dataSources = database.get("data_sources");
        if (dataSources instanceof List<?> list && !list.isEmpty() && list.get(0) instanceof Map<?, ?> source
            && source.get("id") != null) {
            return source.get("id").toString();
        }
        return fallbackDatabaseId;
    }

    private String stringValue(Object value) {
        return value == null ? null : value.toString();
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
