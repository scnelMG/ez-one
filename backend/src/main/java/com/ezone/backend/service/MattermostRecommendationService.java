package com.ezone.backend.service;

import com.ezone.backend.domain.persistence.MattermostParsedJobPostRow;
import com.ezone.backend.dto.basket.BasketJobResponse;
import com.ezone.backend.dto.basket.CreateBasketJobRequest;
import com.ezone.backend.dto.dashboard.DashboardJobResponse;
import com.ezone.backend.mapper.MattermostMapper;
import com.ezone.backend.mapper.UserProfileMapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import java.time.MonthDay;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
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
    private static final int MAX_AI_SCORE_REQUESTS_PER_LIST = 24;

    private final MattermostMapper mattermostMapper;
    private final P1WorkspaceMapperSupport workspaceSupport;
    private final P1WorkspaceService workspaceService;
    @SuppressWarnings("unused")
    private final Optional<AiJobRecommendationClient> aiRecommendationClient;
    private final MattermostRecommendationScoringService scoringService;
    private final UserProfileMapper userProfileMapper;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public MattermostRecommendationService(
        MattermostMapper mattermostMapper,
        P1WorkspaceMapperSupport workspaceSupport,
        P1WorkspaceService workspaceService,
        Optional<AiJobRecommendationClient> aiRecommendationClient,
        MattermostRecommendationScoringService scoringService,
        UserProfileMapper userProfileMapper
    ) {
        this.mattermostMapper = mattermostMapper;
        this.workspaceSupport = workspaceSupport;
        this.workspaceService = workspaceService;
        this.aiRecommendationClient = aiRecommendationClient;
        this.scoringService = scoringService;
        this.userProfileMapper = userProfileMapper;
    }

    public List<DashboardJobResponse> listOpenRecommendations(Long userId) {
        return listRecommendations(userId, "open");
    }

    public List<DashboardJobResponse> listRecommendations(Long userId, String deadlineMode) {
        LocalDate today = LocalDate.now();
        boolean exactDeadlineMode = "exact".equalsIgnoreCase(safe(deadlineMode));
        List<MattermostParsedJobPostRow> openRows = mattermostMapper.listRecommendationCandidates(userId).stream()
            .filter(row -> exactDeadlineMode ? exactDeadlineDate(row, today).isPresent() : isOpenDeadline(row, today))
            .toList();
        List<MattermostParsedJobPostRow> uniqueRows = dedupeCandidates(openRows);
        UserRecommendationProfile profile = recommendationProfile(userId);
        String modelVersion = modelVersion(profile);
        queueMissingAiScores(userId, uniqueRows, profile, modelVersion);
        List<DashboardJobResponse> sortedResponses = uniqueRows.stream()
            .map(row -> toRecommendationResponse(row, today, exactDeadlineMode))
            .sorted(recommendationComparator(exactDeadlineMode))
            .toList();
        return exactDeadlineMode ? diversifyCompanies(sortedResponses) : sortedResponses;
    }

    private List<MattermostParsedJobPostRow> dedupeCandidates(List<MattermostParsedJobPostRow> rows) {
        Map<String, MattermostParsedJobPostRow> byKey = new LinkedHashMap<>();
        for (MattermostParsedJobPostRow row : rows) {
            String key = duplicateKey(row);
            MattermostParsedJobPostRow existing = byKey.get(key);
            if (existing == null || shouldReplaceDuplicate(existing, row)) {
                byKey.put(key, row);
            }
        }
        return List.copyOf(byKey.values());
    }

    private String duplicateKey(MattermostParsedJobPostRow row) {
        String url = safe(row.getUrl()).toLowerCase(Locale.ROOT).replaceAll("/+$", "");
        if (!url.isBlank()) {
            return "url:" + url;
        }
        return "text:%s|%s".formatted(normalizeDuplicateText(row.getCompanyName()), normalizeDuplicateText(row.getTitle()));
    }

    private String normalizeDuplicateText(String value) {
        return safe(value).replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
    }

    private boolean shouldReplaceDuplicate(MattermostParsedJobPostRow existing, MattermostParsedJobPostRow candidate) {
        if (existing.getPromotedJobId() == null && candidate.getPromotedJobId() != null) {
            return true;
        }
        if (!"READY".equalsIgnoreCase(safe(existing.getRecommendationStatus()))
            && "READY".equalsIgnoreCase(safe(candidate.getRecommendationStatus()))) {
            return true;
        }
        return normalizeNullableScore(candidate.getRecommendationScore()) > normalizeNullableScore(existing.getRecommendationScore());
    }

    private Comparator<DashboardJobResponse> recommendationComparator(boolean exactDeadlineMode) {
        if (exactDeadlineMode) {
            return Comparator.comparing((DashboardJobResponse response) -> recommendationStatusRank(response.recommendationStatus()))
                .thenComparing(DashboardJobResponse::recommendationScore, Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(
                    DashboardJobResponse::deadlineLabel,
                    Comparator.nullsLast(Comparator.reverseOrder())
                )
                .thenComparing(DashboardJobResponse::basketJobId);
        }
        return Comparator.comparing(DashboardJobResponse::recommendationScore, Comparator.nullsLast(Comparator.reverseOrder()))
            .thenComparing(response -> DeadlineLabelRanker.rank(response.deadlineLabel()))
            .thenComparing(DashboardJobResponse::basketJobId);
    }

    private List<DashboardJobResponse> diversifyCompanies(List<DashboardJobResponse> responses) {
        Map<String, java.util.ArrayDeque<DashboardJobResponse>> byCompany = new LinkedHashMap<>();
        for (DashboardJobResponse response : responses) {
            byCompany.computeIfAbsent(normalizeDuplicateText(response.companyName()), ignored -> new java.util.ArrayDeque<>())
                .add(response);
        }
        java.util.ArrayList<DashboardJobResponse> diversified = new java.util.ArrayList<>(responses.size());
        boolean added;
        do {
            added = false;
            for (java.util.ArrayDeque<DashboardJobResponse> companyRows : byCompany.values()) {
                DashboardJobResponse next = companyRows.pollFirst();
                if (next != null) {
                    diversified.add(next);
                    added = true;
                }
            }
        } while (added);
        return diversified;
    }

    private int recommendationStatusRank(String status) {
        String value = safe(status).toUpperCase(Locale.ROOT);
        if ("READY".equals(value)) {
            return 0;
        }
        if ("FALLBACK".equals(value)) {
            return 1;
        }
        return 2;
    }

    private void queueMissingAiScores(
        Long userId,
        List<MattermostParsedJobPostRow> openRows,
        UserRecommendationProfile profile,
        String modelVersion
    ) {
        List<MattermostParsedJobPostRow> missingScoreRows = openRows.stream()
            .filter(row -> needsAiScore(row, modelVersion))
            .toList();
        missingScoreRows.forEach(this::markPendingInResponse);
        List<MattermostParsedJobPostRow> candidatesToScore = missingScoreRows.stream()
            .limit(MAX_AI_SCORE_REQUESTS_PER_LIST)
            .toList();
        if (candidatesToScore.isEmpty()) {
            return;
        }
        for (MattermostParsedJobPostRow row : candidatesToScore) {
            mattermostMapper.insertPendingRecommendationScoreIfAbsent(
                userId,
                row.getId(),
                modelVersion
            );
        }
        scoringService.scoreCandidates(userId, candidatesToScore, profile, modelVersion);
    }

    private void markPendingInResponse(MattermostParsedJobPostRow row) {
        row.setRecommendationStatus("PENDING");
        row.setRecommendationScore(null);
        row.setRecommendationReason(null);
    }

    private boolean needsAiScore(MattermostParsedJobPostRow row, String modelVersion) {
        String status = safe(row.getRecommendationStatus());
        if (status.isBlank() || "FAILED".equalsIgnoreCase(status)) {
            return true;
        }
        return !"PENDING".equalsIgnoreCase(status)
            && !modelVersion.equals(safe(row.getRecommendationModelVersion()));
    }

    private UserRecommendationProfile recommendationProfile(Long userId) {
        return userProfileMapper.findByUserId(userId)
            .map(row -> UserRecommendationProfile.from(row, objectMapper))
            .orElseGet(UserRecommendationProfile::empty);
    }

    private String modelVersion(UserRecommendationProfile profile) {
        return MattermostRecommendationScoringService.MODEL_VERSION + ":profile-" + profile.fingerprint();
    }

    @Transactional
    public BasketJobResponse saveRecommendation(Long userId, Long candidateId) {
        MattermostParsedJobPostRow candidate = mattermostMapper.findParsedJobPost(candidateId)
            .orElseThrow(() -> new IllegalArgumentException("Mattermost recommendation not found"));
        LocalDate today = LocalDate.now();
        validateSaveableCandidate(candidate, today);
        Long promotedJobId = candidate.getPromotedJobId();
        if (promotedJobId == null) {
            promotedJobId = workspaceSupport.promoteMattermostJob(candidate);
            mattermostMapper.markParsedJobPostReviewed(candidateId, "APPROVED", userId, promotedJobId);
        }
        return workspaceService.createBasketJob(userId, new CreateBasketJobRequest(
            null,
            candidate.getCompanyName(),
            candidate.getTitle(),
            displayDeadlineLabel(candidate, today),
            candidate.getUrl(),
            logoUrl(candidate.getCompanyName(), candidate.getUrl()),
            "MATTERMOST"
        ));
    }

    private void validateSaveableCandidate(MattermostParsedJobPostRow candidate, LocalDate today) {
        if ("REJECTED".equalsIgnoreCase(safe(candidate.getReviewStatus()))) {
            throw new IllegalArgumentException("Mattermost recommendation is not available");
        }
        if (!isOpenDeadline(candidate, today)) {
            throw new IllegalArgumentException("Mattermost recommendation is closed");
        }
    }

    private DashboardJobResponse toRecommendationResponse(MattermostParsedJobPostRow row, LocalDate today) {
        return toRecommendationResponse(row, today, false);
    }

    private DashboardJobResponse toRecommendationResponse(
        MattermostParsedJobPostRow row,
        LocalDate today,
        boolean preserveExactDeadlineDate
    ) {
        String deadlineLabel = preserveExactDeadlineDate
            ? exactDeadlineDate(row, today).map(KOREAN_DATE_FORMAT::format).orElseGet(() -> displayDeadlineLabel(row, today))
            : displayDeadlineLabel(row, today);
        RecommendationSignal signal = recommendationSignal(row, deadlineLabel);
        CompanyRecommendationInfo companyInfo = companyInfo(row.getCompanyName(), row.getUrl());
        return new DashboardJobResponse(
            row.getId(),
            null,
            row.getCompanyName(),
            row.getTitle(),
            deadlineLabel,
            companyInfo.logoUrl(),
            companyInfo.domain().orElse(null),
            companyInfo.companyType().orElse(null),
            row.getUrl(),
            signal.score(),
            signal.reason(),
            recommendationStatus(row, signal),
            row.getPostedAt(),
            row.getReceivedAt()
        );
    }

    private RecommendationSignal recommendationSignal(MattermostParsedJobPostRow row, String deadlineLabel) {
        String status = safe(row.getRecommendationStatus()).toUpperCase(Locale.ROOT);
        if ("PENDING".equals(status)) {
            return new RecommendationSignal(null, "추천도 계산 대기 중입니다.");
        }
        if ("READY".equals(status) && row.getRecommendationScore() != null) {
            return new RecommendationSignal(
                normalizeScore(row.getRecommendationScore()),
                safeReason(row.getRecommendationReason(), "저장된 AI 추천도 기준으로 우선 검토할 만합니다.")
            );
        }
        return new RecommendationSignal(null, "추천도 계산 대기 중입니다.");
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
        String label = displayDeadlineLabel(deadlineLabel, today);
        if (label.equals("마감됨")) {
            return false;
        }
        if (label.equals("마감일 미확인") || label.equals("상시 채용") || label.equals("수시 채용") || label.equals("채용 시 마감")) {
            return true;
        }
        Matcher dDayMatcher = D_DAY_PATTERN.matcher(label);
        if (dDayMatcher.matches()) {
            return Integer.parseInt(dDayMatcher.group(1)) >= 0;
        }
        if (label.equals("오늘 마감")) {
            return true;
        }
        try {
            return !LocalDate.parse(label, KOREAN_DATE_FORMAT).isBefore(today);
        }
        catch (DateTimeParseException ignored) {
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

    private boolean isOpenDeadline(MattermostParsedJobPostRow row, LocalDate today) {
        String deadlineDate = safe(row.getDeadlineDate());
        if (!deadlineDate.isBlank()) {
            try {
                return !LocalDate.parse(deadlineDate).isBefore(today);
            } catch (DateTimeParseException ignored) {
                // Fall back to display label parsing below.
            }
        }
        String normalized = safe(row.getNormalizedDeadlineLabel());
        return isOpenDeadline(shouldPreferRawDeadline(row) || normalized.isBlank() ? row.getDeadlineLabel() : normalized, today);
    }

    private Optional<LocalDate> exactDeadlineDate(MattermostParsedJobPostRow row, LocalDate today) {
        String deadlineDate = safe(row.getDeadlineDate());
        if (!deadlineDate.isBlank()) {
            try {
                return Optional.of(LocalDate.parse(deadlineDate));
            }
            catch (DateTimeParseException ignored) {
                // Fall through to label parsing.
            }
        }
        Optional<LocalDate> normalized = exactDeadlineDate(safe(row.getNormalizedDeadlineLabel()), today);
        if (normalized.isPresent()) {
            return normalized;
        }
        return exactDeadlineDate(safe(row.getDeadlineLabel()), today);
    }

    private Optional<LocalDate> exactDeadlineDate(String label, LocalDate today) {
        if (label.isBlank() || label.contains("상시") || label.contains("수시") || label.contains("채용 시")) {
            return Optional.empty();
        }
        try {
            return Optional.of(LocalDate.parse(label, KOREAN_DATE_FORMAT));
        }
        catch (DateTimeParseException ignored) {
            // Try the Mattermost month/day format.
        }
        Matcher monthDayMatcher = MONTH_DAY_PATTERN.matcher(label);
        if (monthDayMatcher.matches()) {
            MonthDay deadline = MonthDay.of(
                Integer.parseInt(monthDayMatcher.group(1)),
                Integer.parseInt(monthDayMatcher.group(2))
            );
            return Optional.of(deadline.atYear(today.getYear()));
        }
        return Optional.empty();
    }

    private String displayDeadlineLabel(MattermostParsedJobPostRow row, LocalDate today) {
        String normalized = safe(row.getNormalizedDeadlineLabel());
        return shouldPreferRawDeadline(row) || normalized.isBlank() ? displayDeadlineLabel(row.getDeadlineLabel(), today) : normalized;
    }

    private boolean shouldPreferRawDeadline(MattermostParsedJobPostRow row) {
        return safe(row.getDeadlineLabel()).contains("채용 시 마감");
    }

    private String displayDeadlineLabel(String deadlineLabel, LocalDate today) {
        String label = safe(deadlineLabel);
        if (label.isBlank()) {
            return "마감일 미확인";
        }
        if (label.contains("채용 시 마감")) {
            return "채용 시 마감";
        }
        if (label.contains("상시")) {
            return "상시 채용";
        }
        if (label.contains("수시")) {
            return "수시 채용";
        }
        Matcher dDayMatcher = D_DAY_PATTERN.matcher(label);
        if (dDayMatcher.matches()) {
            int days = Integer.parseInt(dDayMatcher.group(1));
            return days == 0 ? "오늘 마감" : "D-" + days;
        }
        if (label.equals("오늘")) {
            return "오늘 마감";
        }
        try {
            LocalDate date = LocalDate.parse(label, KOREAN_DATE_FORMAT);
            return date.isBefore(today) ? "마감됨" : KOREAN_DATE_FORMAT.format(date);
        }
        catch (DateTimeParseException ignored) {
            // Try the next known Mattermost deadline format.
        }
        Matcher monthDayMatcher = MONTH_DAY_PATTERN.matcher(label);
        if (monthDayMatcher.matches()) {
            MonthDay deadline = MonthDay.of(
                Integer.parseInt(monthDayMatcher.group(1)),
                Integer.parseInt(monthDayMatcher.group(2))
            );
            LocalDate currentYearDeadline = deadline.atYear(today.getYear());
            return currentYearDeadline.isBefore(today)
                ? "마감됨"
                : KOREAN_DATE_FORMAT.format(currentYearDeadline);
        }
        return "마감일 미확인";
    }

    private String logoUrl(String companyName, String sourceUrl) {
        Optional<String> domain = knownDomain(companyName, sourceUrl);
        String overrideLogoUrl = logoOverride(companyName, domain.orElse(null));
        if (overrideLogoUrl != null) {
            return overrideLogoUrl;
        }
        return domain
            .map(value -> "https://www.google.com/s2/favicons?domain=%s&sz=128".formatted(value))
            .orElse(null);
    }

    private CompanyRecommendationInfo companyInfo(String companyName, String sourceUrl) {
        Optional<OfficialCompanyRegistry.OfficialCompany> official = OfficialCompanyRegistry.resolve(companyName);
        if (official.isPresent()) {
            OfficialCompanyRegistry.OfficialCompany company = official.get();
            String overrideLogoUrl = logoOverride(companyName, company.domain());
            return new CompanyRecommendationInfo(
                Optional.of(company.domain()),
                Optional.of(company.companyType()),
                overrideLogoUrl != null
                    ? overrideLogoUrl
                    : "https://www.google.com/s2/favicons?domain=%s&sz=128".formatted(company.domain())
            );
        }

        CompanyDetailDefaults.CompanyDefaults defaults = CompanyDetailDefaults.resolve(companyName, sourceUrl);
        Optional<String> domain = CompanyDetailDefaults.UNKNOWN_DOMAIN.equals(defaults.domain())
            ? Optional.empty()
            : Optional.of(defaults.domain());
        Optional<String> companyType = CompanyDetailDefaults.UNKNOWN_KO.equals(defaults.companyType())
            ? Optional.empty()
            : Optional.of(defaults.companyType());
        String overrideLogoUrl = logoOverride(companyName, domain.orElse(null));
        return new CompanyRecommendationInfo(
            domain,
            companyType,
            overrideLogoUrl != null
                ? overrideLogoUrl
                : domain.map(value -> "https://www.google.com/s2/favicons?domain=%s&sz=128".formatted(value)).orElse(null)
        );
    }

    private String logoOverride(String companyName, String domain) {
        String normalized = safe(companyName).replaceAll("\\s+", "").toLowerCase(Locale.ROOT);
        String normalizedDomain = safe(domain).toLowerCase(Locale.ROOT);
        if (normalized.contains("한국선급") || "kr".equals(normalized)) {
            return "https://www.krs.co.kr/images/common/logo.png";
        }
        if ("snetsystems.co.kr".equals(normalizedDomain)) {
            return "https://media-cdn.linkareer.com/activity_manager/logos/758556?d=208xauto";
        }
        return null;
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

    private int normalizeNullableScore(Integer score) {
        return score == null ? 0 : normalizeScore(score);
    }

    private String safeReason(String reason, String fallback) {
        return safe(reason).isBlank() ? fallback : reason.trim();
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }

    private String recommendationStatus(MattermostParsedJobPostRow row, RecommendationSignal signal) {
        String status = safe(row.getRecommendationStatus()).toUpperCase(Locale.ROOT);
        if ("READY".equals(status) && signal.score() != null) {
            return "READY";
        }
        if ("PENDING".equals(status)) {
            return "PENDING";
        }
        return "FALLBACK";
    }

    private record RecommendationSignal(Integer score, String reason) {
    }

    private record CompanyRecommendationInfo(Optional<String> domain, Optional<String> companyType, String logoUrl) {
    }
}
