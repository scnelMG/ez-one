package com.ezone.backend.service;

import com.ezone.backend.dto.extension.ApplicationActivityAssistRequest;
import com.ezone.backend.dto.extension.ApplicationActivityAssistResponse;
import com.ezone.backend.dto.extension.ApplicationActivityRecommendation;
import com.ezone.backend.dto.extension.ApplicationActivityRecommendationDraft;
import com.ezone.backend.dto.profile.DocumentProfileResponse;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import org.springframework.stereotype.Service;

@Service
public class ApplicationActivityAssistService {

    private static final int DEFAULT_MAX_ITEMS = 2;
    private static final int MAX_ITEMS_LIMIT = 5;
    private static final int DEFAULT_DETAIL_LIMIT = 500;
    private static final int MAX_DETAIL_LIMIT = 3000;
    private static final int MIN_LIMIT_FOR_TARGET_FILL = 200;
    private static final double TARGET_FILL_RATIO = 0.9;

    private final ProfileService profileService;
    private final ApplicationActivityAssistAiClient aiClient;

    public ApplicationActivityAssistService(ProfileService profileService, ApplicationActivityAssistAiClient aiClient) {
        this.profileService = profileService;
        this.aiClient = aiClient;
    }

    public ApplicationActivityAssistResponse recommend(Long userId, ApplicationActivityAssistRequest request) {
        int maxItems = clamp(request.maxItems(), DEFAULT_MAX_ITEMS, 1, MAX_ITEMS_LIMIT);
        int detailLimit = clamp(request.detailLimit(), DEFAULT_DETAIL_LIMIT, 1, MAX_DETAIL_LIMIT);
        String detailLimitUnit = "byte".equalsIgnoreCase(safe(request.detailLimitUnit())) ? "byte" : "char";
        List<ActivityCandidate> candidates = loadCandidates(userId);
        if (candidates.isEmpty()) {
            return new ApplicationActivityAssistResponse(
                List.of(),
                List.of("저장된 프로젝트/활동 정보가 없어 추천을 만들 수 없습니다.")
            );
        }

        List<String> warnings = new ArrayList<>();
        List<ApplicationActivityRecommendation> recommendations = aiClient
            .recommend(request, candidates, maxItems, detailLimit, detailLimitUnit)
            .filter(items -> !items.isEmpty())
            .orElseGet(() -> {
                warnings.add("AI 연결이 불안정해 저장된 활동 기준으로 임시 추천했습니다.");
                return fallbackRecommendations(request, candidates, maxItems, detailLimit, detailLimitUnit);
            });

        return new ApplicationActivityAssistResponse(
            fillDraftsTowardLimit(recommendations, request, candidates, detailLimit, detailLimitUnit),
            warnings
        );
    }

    private List<ActivityCandidate> loadCandidates(Long userId) {
        DocumentProfileResponse profile = profileService.getDocumentProfile(userId);
        Map<String, Object> sections = profile.sections() == null ? Map.of() : profile.sections();
        List<ActivityCandidate> candidates = new ArrayList<>();
        addCandidates(candidates, "프로젝트", sectionItems(sections.get("projects"), "projects"));
        addCandidates(candidates, "대외 활동", sectionItems(sections.get("activities"), "activities"));
        Object other = sections.get("other");
        if (other instanceof Map<?, ?> otherMap) {
            addCandidates(candidates, "대외 활동", sectionItems(otherMap.get("activities"), "activities"));
        }
        return candidates.stream()
            .filter(candidate -> !candidate.title().isBlank())
            .toList();
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> sectionItems(Object section, String key) {
        if (section instanceof Map<?, ?> map) {
            Object nested = map.get(key);
            if (nested instanceof List<?> list) {
                return list.stream()
                    .filter(Map.class::isInstance)
                    .map(item -> (Map<String, Object>) item)
                    .toList();
            }
        }
        if (section instanceof List<?> list) {
            return list.stream()
                .filter(Map.class::isInstance)
                .map(item -> (Map<String, Object>) item)
                .toList();
        }
        return List.of();
    }

    private void addCandidates(List<ActivityCandidate> candidates, String category, List<Map<String, Object>> items) {
        for (Map<String, Object> item : items) {
            String title = firstText(item, "projectName", "activityName", "title", "name");
            String role = firstText(item, "role", "position", "contribution");
            String organization = firstText(item, "organization", "team", "company");
            String summary = firstText(item, "summary", "description", "contents", "mainActivity", "contribution");
            String outcome = firstText(item, "outcome", "achievement", "result");
            String skills = firstText(item, "techStack", "skills", "keywords");
            candidates.add(new ActivityCandidate(category, title, role, organization, summary, outcome, skills, item));
        }
    }

    private List<ApplicationActivityRecommendation> fallbackRecommendations(
        ApplicationActivityAssistRequest request,
        List<ActivityCandidate> candidates,
        int maxItems,
        int detailLimit,
        String detailLimitUnit
    ) {
        List<String> jobTerms = tokenize(safe(request.positionTitle()) + " " + safe(request.pageContext()));
        List<ActivityCandidate> ranked = candidates.stream()
            .sorted(Comparator
                .comparingInt((ActivityCandidate candidate) -> score(candidate, jobTerms))
                .reversed()
                .thenComparing(ActivityCandidate::title))
            .limit(maxItems)
            .toList();

        List<ApplicationActivityRecommendation> recommendations = new ArrayList<>();
        for (int index = 0; index < ranked.size(); index += 1) {
            ActivityCandidate candidate = ranked.get(index);
            int fitScore = Math.max(55, Math.min(95, score(candidate, jobTerms)));
            String draft = fitToLimit(buildDraft(candidate, request), detailLimit, detailLimitUnit);
            recommendations.add(new ApplicationActivityRecommendation(
                index + 1,
                candidate.title(),
                fitScore,
                "직무 관련성, 역할, 성과가 드러나는 활동인지 우선 확인하세요.",
                "실제 기여 범위와 사용 기술, 문제 해결 방식이 구체적인지 점검하세요.",
                appealPoints(candidate),
                riskPoints(candidate),
                List.of(toDraft("제한 맞춤", draft, detailLimit, detailLimitUnit))
            ));
        }
        return recommendations;
    }

    private int score(ActivityCandidate candidate, List<String> jobTerms) {
        String haystack = candidate.searchText().toLowerCase(Locale.ROOT);
        int score = candidate.category().contains("프로젝트") ? 64 : 58;
        for (String term : jobTerms) {
            if (!term.isBlank() && haystack.contains(term)) {
                score += 8;
            }
        }
        if (!candidate.outcome().isBlank()) score += 8;
        if (!candidate.skills().isBlank()) score += 7;
        if (!candidate.role().isBlank()) score += 5;
        return score;
    }

    private String buildDraft(ActivityCandidate candidate, ApplicationActivityAssistRequest request) {
        String target = safe(request.positionTitle()).isBlank() ? "지원 직무" : safe(request.positionTitle());
        String role = defaultText(candidate.role(), "주요 기여자");
        String summary = defaultText(candidate.summary(), "목표 달성을 위한 기획과 실행");
        String outcome = candidate.outcome().isBlank() ? "" : " 성과는 " + candidate.outcome() + "입니다.";
        String skills = candidate.skills().isBlank() ? "" : " 사용 역량은 " + candidate.skills() + "입니다.";
        return "%s에서 %s 역할로 %s 경험을 수행했습니다.%s%s 이 경험은 %s에서 요구하는 문제 해결력과 실행력을 보여줄 수 있습니다."
            .formatted(candidate.title(), role, summary, outcome, skills, target)
            .replaceAll("\\s+", " ")
            .trim();
    }

    private List<String> appealPoints(ActivityCandidate candidate) {
        List<String> points = new ArrayList<>();
        if (!candidate.role().isBlank()) points.add("역할: " + candidate.role());
        if (!candidate.skills().isBlank()) points.add("기술/역량: " + candidate.skills());
        if (!candidate.outcome().isBlank()) points.add("성과: " + candidate.outcome());
        if (points.isEmpty()) points.add(candidate.category() + " 경험");
        return points;
    }

    private List<String> riskPoints(ActivityCandidate candidate) {
        List<String> risks = new ArrayList<>();
        if (candidate.outcome().isBlank()) risks.add("성과 수치나 결과를 보강하면 더 설득력 있습니다.");
        if (candidate.role().isBlank()) risks.add("본인 기여 범위를 더 구체화하세요.");
        return risks;
    }

    private ApplicationActivityRecommendationDraft toDraft(String label, String text, int limit, String unit) {
        int charCount = text.length();
        int byteCount = text.getBytes(StandardCharsets.UTF_8).length;
        int count = "byte".equals(unit) ? byteCount : charCount;
        return new ApplicationActivityRecommendationDraft(label, text, charCount, byteCount, count > limit);
    }

    private List<ApplicationActivityRecommendation> fillDraftsTowardLimit(
        List<ApplicationActivityRecommendation> recommendations,
        ApplicationActivityAssistRequest request,
        List<ActivityCandidate> candidates,
        int limit,
        String unit
    ) {
        if (limit < MIN_LIMIT_FOR_TARGET_FILL) return recommendations;
        List<ApplicationActivityRecommendation> adjusted = new ArrayList<>();
        for (ApplicationActivityRecommendation recommendation : recommendations) {
            ActivityCandidate candidate = candidateForRecommendation(recommendation, candidates);
            if (candidate == null || recommendation.drafts().isEmpty()) {
                adjusted.add(recommendation);
                continue;
            }
            List<ApplicationActivityRecommendationDraft> drafts = recommendation.drafts().stream()
                .map(draft -> toDraft(
                    draft.label(),
                    expandDraftToTarget(draft.text(), candidate, request, limit, unit),
                    limit,
                    unit
                ))
                .toList();
            adjusted.add(new ApplicationActivityRecommendation(
                recommendation.rank(),
                recommendation.title(),
                recommendation.fitScore(),
                recommendation.recruiterView(),
                recommendation.practitionerView(),
                recommendation.appealPoints(),
                recommendation.risks(),
                drafts
            ));
        }
        return adjusted;
    }

    private ActivityCandidate candidateForRecommendation(ApplicationActivityRecommendation recommendation, List<ActivityCandidate> candidates) {
        String title = normalizeForMatch(recommendation.title());
        if (!title.isBlank()) {
            for (ActivityCandidate candidate : candidates) {
                String candidateTitle = normalizeForMatch(candidate.title());
                if (candidateTitle.equals(title) || candidateTitle.contains(title) || title.contains(candidateTitle)) {
                    return candidate;
                }
            }
        }
        int rankIndex = recommendation.rank() - 1;
        return rankIndex >= 0 && rankIndex < candidates.size() ? candidates.get(rankIndex) : null;
    }

    private String expandDraftToTarget(
        String text,
        ActivityCandidate candidate,
        ApplicationActivityAssistRequest request,
        int limit,
        String unit
    ) {
        String value = fitToLimit(safe(text), limit, unit);
        int target = targetCount(limit);
        if (countForUnit(value, unit) >= target) return value;

        for (String sentence : expansionSentences(candidate, request)) {
            if (sentence.isBlank() || normalizeForMatch(value).contains(normalizeForMatch(sentence))) continue;
            String next = fitToLimit(joinSentence(value, sentence), limit, unit);
            if (next.equals(value)) continue;
            value = next;
            if (countForUnit(value, unit) >= target) break;
        }
        return value;
    }

    private List<String> expansionSentences(ActivityCandidate candidate, ApplicationActivityAssistRequest request) {
        List<String> sentences = new ArrayList<>();
        addSentence(sentences, candidate.summary());
        if (!candidate.role().isBlank()) {
            sentences.add("이 과정에서 맡은 역할은 " + candidate.role() + "입니다.");
        }
        if (!candidate.skills().isBlank()) {
            sentences.add("활용 역량과 기술은 " + candidate.skills() + "입니다.");
        }
        if (!candidate.outcome().isBlank()) {
            addSentence(sentences, candidate.outcome());
        }
        String position = safe(request.positionTitle());
        if (!position.isBlank()) {
            sentences.add(position + " 직무 관점에서 문제를 구조화하고 실행 결과를 설명할 수 있는 경험입니다.");
            sentences.add("지원 직무와 연결해 데이터 확인, 원인 분석, 결과 정리, 개선 제안으로 이어지는 흐름을 보여줄 수 있습니다.");
        }
        if (!candidate.summary().isBlank() || !candidate.outcome().isBlank()) {
            sentences.add("단순 참여가 아니라 과제의 배경을 이해하고 필요한 자료를 정리한 뒤 결과를 지원서 문항에 맞게 전달할 수 있다는 점을 강조할 수 있습니다.");
            sentences.add("또한 활동에서 사용한 방법과 결과를 함께 제시할 수 있어 경험의 신뢰도와 직무 적합성을 동시에 보여줍니다.");
        }
        return sentences;
    }

    private void addSentence(List<String> sentences, String value) {
        String text = safe(value);
        if (text.isBlank()) return;
        sentences.add(text.endsWith(".") || text.endsWith("다.") || text.endsWith("요.") ? text : text + ".");
    }

    private String joinSentence(String base, String sentence) {
        String left = safe(base);
        String right = safe(sentence);
        if (left.isBlank()) return right;
        if (right.isBlank()) return left;
        return (left + " " + right).replaceAll("\\s+", " ").trim();
    }

    private int targetCount(int limit) {
        return Math.max(1, (int) Math.floor(limit * TARGET_FILL_RATIO));
    }

    private int countForUnit(String text, String unit) {
        return "byte".equals(unit) ? text.getBytes(StandardCharsets.UTF_8).length : text.length();
    }

    private String normalizeForMatch(String value) {
        return safe(value).toLowerCase(Locale.ROOT).replaceAll("\\s+", "");
    }

    private String fitToLimit(String text, int limit, String unit) {
        if (limit <= 0) return text;
        String value = text;
        while (!value.isEmpty()) {
            int count = countForUnit(value, unit);
            if (count <= limit) return value;
            value = value.substring(0, value.length() - 1).stripTrailing();
        }
        return value;
    }

    private List<String> tokenize(String value) {
        if (value.isBlank()) return List.of();
        String normalized = value.toLowerCase(Locale.ROOT).replaceAll("[^0-9a-z가-힣#.]+", " ");
        List<String> terms = new ArrayList<>();
        for (String term : normalized.split("\\s+")) {
            if (term.length() >= 2) {
                terms.add(term);
            }
        }
        return terms;
    }

    private int clamp(Integer value, int defaultValue, int min, int max) {
        int resolved = value == null ? defaultValue : value;
        return Math.max(min, Math.min(max, resolved));
    }

    private String firstText(Map<String, Object> item, String... keys) {
        for (String key : keys) {
            Object value = item.get(key);
            if (value instanceof List<?> list) {
                String joined = list.stream()
                    .map(Objects::toString)
                    .filter(text -> !text.isBlank())
                    .reduce((left, right) -> left + ", " + right)
                    .orElse("");
                if (!joined.isBlank()) return joined;
            }
            if (value != null && !value.toString().isBlank()) {
                return value.toString().trim();
            }
        }
        return "";
    }

    private String defaultText(String value, String fallback) {
        return value.isBlank() ? fallback : value;
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }

    public record ActivityCandidate(
        String category,
        String title,
        String role,
        String organization,
        String summary,
        String outcome,
        String skills,
        Map<String, Object> source
    ) {
        String searchText() {
            return String.join(" ", category, title, role, organization, summary, outcome, skills);
        }
    }
}
