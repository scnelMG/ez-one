package com.ezone.backend.service;

import com.ezone.backend.domain.persistence.MattermostParsedJobPostRow;
import com.ezone.backend.dto.basket.BasketJobResponse;
import com.ezone.backend.dto.basket.CreateBasketJobRequest;
import com.ezone.backend.dto.dashboard.DashboardJobResponse;
import com.ezone.backend.mapper.MattermostMapper;
import java.time.LocalDate;
import java.time.MonthDay;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MattermostRecommendationService {

    private static final Pattern D_DAY_PATTERN = Pattern.compile("^D-(\\d+)$", Pattern.CASE_INSENSITIVE);
    private static final Pattern MONTH_DAY_PATTERN = Pattern.compile("^(\\d{1,2})/(\\d{1,2})(?:\\([^)]*\\))?.*$");
    private static final DateTimeFormatter KOREAN_DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy.MM.dd");

    private final MattermostMapper mattermostMapper;
    private final P1WorkspaceMapperSupport workspaceSupport;
    private final P1WorkspaceService workspaceService;
    private final Optional<AiJobRecommendationClient> aiRecommendationClient;

    public MattermostRecommendationService(
        MattermostMapper mattermostMapper,
        P1WorkspaceMapperSupport workspaceSupport,
        P1WorkspaceService workspaceService,
        Optional<AiJobRecommendationClient> aiRecommendationClient
    ) {
        this.mattermostMapper = mattermostMapper;
        this.workspaceSupport = workspaceSupport;
        this.workspaceService = workspaceService;
        this.aiRecommendationClient = aiRecommendationClient;
    }

    public List<DashboardJobResponse> listOpenRecommendations(Long userId) {
        LocalDate today = LocalDate.now();
        return mattermostMapper.listRecommendationCandidates().stream()
            .filter(row -> isOpenDeadline(row.getDeadlineLabel(), today))
            .map(this::toRecommendationResponse)
            .sorted(Comparator.comparing(DashboardJobResponse::recommendationScore, Comparator.reverseOrder())
                .thenComparing(response -> DeadlineLabelRanker.rank(response.deadlineLabel()))
                .thenComparing(DashboardJobResponse::basketJobId))
            .toList();
    }

    @Transactional
    public BasketJobResponse saveRecommendation(Long userId, Long candidateId) {
        MattermostParsedJobPostRow candidate = mattermostMapper.findParsedJobPost(candidateId)
            .orElseThrow(() -> new IllegalArgumentException("Mattermost recommendation not found"));
        Long promotedJobId = candidate.getPromotedJobId();
        if (promotedJobId == null) {
            promotedJobId = workspaceSupport.promoteMattermostJob(candidate);
            mattermostMapper.markParsedJobPostReviewed(candidateId, "APPROVED", userId, promotedJobId);
        }
        return workspaceService.createBasketJob(userId, new CreateBasketJobRequest(
            null,
            candidate.getCompanyName(),
            candidate.getTitle(),
            candidate.getDeadlineLabel(),
            candidate.getUrl(),
            logoUrl(candidate.getCompanyName(), candidate.getUrl()),
            "MATTERMOST"
        ));
    }

    private DashboardJobResponse toRecommendationResponse(MattermostParsedJobPostRow row) {
        RecommendationSignal signal = recommend(row);
        CompanyRecommendationInfo companyInfo = companyInfo(row.getCompanyName(), row.getUrl());
        return new DashboardJobResponse(
            row.getId(),
            null,
            row.getCompanyName(),
            row.getTitle(),
            row.getDeadlineLabel(),
            companyInfo.logoUrl(),
            companyInfo.domain().orElse(null),
            companyInfo.companyType().orElse(null),
            row.getUrl(),
            signal.score(),
            signal.reason(),
            row.getPostedAt(),
            row.getReceivedAt()
        );
    }

    private RecommendationSignal recommend(MattermostParsedJobPostRow row) {
        Optional<AiJobRecommendationClient.AiRecommendationSignal> aiSignal = aiRecommendationClient
            .flatMap(client -> client.recommend(row));
        if (aiSignal.isPresent()) {
            AiJobRecommendationClient.AiRecommendationSignal signal = aiSignal.get();
            return new RecommendationSignal(normalizeScore(signal.score()), safeReason(signal.reason()));
        }

        int score = 55;
        String reason = "MM 공고의 직무 키워드와 마감 정보를 기준으로 추천";
        String text = (safe(row.getCompanyName()) + " " + safe(row.getTitle())).toLowerCase(Locale.ROOT);
        if (hasTechKeyword(text)) {
            score += 20;
            reason = "직무 키워드가 SSAFY 지원자에게 적합";
        }
        if (isSoon(row.getDeadlineLabel())) {
            score += 15;
            reason = "마감이 가까운 공고라 우선 추천";
        }
        if (knownDomain(row.getCompanyName(), row.getUrl()).isPresent()) {
            score += 10;
        }
        return new RecommendationSignal(normalizeScore(score), reason);
    }

    private boolean hasTechKeyword(String text) {
        return text.contains("developer")
            || text.contains("engineer")
            || text.contains("platform")
            || text.contains("backend")
            || text.contains("frontend")
            || text.contains("server")
            || text.contains("data")
            || text.contains("ai")
            || text.contains("it")
            || text.contains("sw")
            || text.contains("개발")
            || text.contains("데이터")
            || text.contains("보안")
            || text.contains("인프라")
            || text.contains("플랫폼");
    }

    private boolean isSoon(String deadlineLabel) {
        Matcher matcher = D_DAY_PATTERN.matcher(safe(deadlineLabel));
        return matcher.matches() && Integer.parseInt(matcher.group(1)) <= 7;
    }

    private boolean isOpenDeadline(String deadlineLabel, LocalDate today) {
        String label = safe(deadlineLabel);
        if (label.isBlank()) {
            return true;
        }
        if (label.contains("상시") || label.contains("수시") || label.contains("채용 시 마감") || label.contains("미정")) {
            return true;
        }
        Matcher dDayMatcher = D_DAY_PATTERN.matcher(label);
        if (dDayMatcher.matches()) {
            return Integer.parseInt(dDayMatcher.group(1)) >= 0;
        }
        if (label.equals("오늘")) {
            return true;
        }
        try {
            return !LocalDate.parse(label, KOREAN_DATE_FORMAT).isBefore(today);
        } catch (DateTimeParseException ignored) {
            // Try the next known Mattermost deadline format.
        }
        Matcher monthDayMatcher = MONTH_DAY_PATTERN.matcher(label);
        if (monthDayMatcher.matches()) {
            MonthDay deadline = MonthDay.of(
                Integer.parseInt(monthDayMatcher.group(1)),
                Integer.parseInt(monthDayMatcher.group(2))
            );
            LocalDate currentYearDeadline = deadline.atYear(today.getYear());
            return !currentYearDeadline.isBefore(today);
        }
        return true;
    }

    private String logoUrl(String companyName, String sourceUrl) {
        return knownDomain(companyName, sourceUrl)
            .map(domain -> "https://www.google.com/s2/favicons?domain=%s&sz=128".formatted(domain))
            .orElse(null);
    }

    private CompanyRecommendationInfo companyInfo(String companyName, String sourceUrl) {
        Optional<OfficialCompanyRegistry.OfficialCompany> official = OfficialCompanyRegistry.resolve(companyName);
        if (official.isPresent()) {
            OfficialCompanyRegistry.OfficialCompany company = official.get();
            return new CompanyRecommendationInfo(
                Optional.of(company.domain()),
                Optional.of(company.companyType()),
                "https://www.google.com/s2/favicons?domain=%s&sz=128".formatted(company.domain())
            );
        }

        CompanyDetailDefaults.CompanyDefaults defaults = CompanyDetailDefaults.resolve(companyName, sourceUrl);
        Optional<String> domain = CompanyDetailDefaults.UNKNOWN_DOMAIN.equals(defaults.domain())
            ? Optional.empty()
            : Optional.of(defaults.domain());
        Optional<String> companyType = CompanyDetailDefaults.UNKNOWN_KO.equals(defaults.companyType())
            ? Optional.empty()
            : Optional.of(defaults.companyType());
        return new CompanyRecommendationInfo(
            domain,
            companyType,
            domain.map(value -> "https://www.google.com/s2/favicons?domain=%s&sz=128".formatted(value)).orElse(null)
        );
    }

    private Optional<String> knownDomain(String companyName, String sourceUrl) {
        Optional<String> officialDomain = OfficialCompanyRegistry.resolve(companyName)
            .map(OfficialCompanyRegistry.OfficialCompany::domain);
        if (officialDomain.isPresent()) {
            return officialDomain;
        }
        String domain = CompanyDetailDefaults.resolve(companyName, sourceUrl).domain();
        return CompanyDetailDefaults.UNKNOWN_DOMAIN.equals(domain) ? Optional.empty() : Optional.of(domain);
    }

    private int normalizeScore(int score) {
        return Math.max(0, Math.min(score, 100));
    }

    private String safeReason(String reason) {
        return safe(reason).isBlank() ? "GMS AI가 공고와 사용자 적합도를 기준으로 추천" : reason.trim();
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }

    private record RecommendationSignal(int score, String reason) {
    }

    private record CompanyRecommendationInfo(Optional<String> domain, Optional<String> companyType, String logoUrl) {
    }
}
