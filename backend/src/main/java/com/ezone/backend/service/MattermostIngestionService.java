package com.ezone.backend.service;

import com.ezone.backend.domain.persistence.MattermostMessageRow;
import com.ezone.backend.domain.persistence.MattermostParsedJobPostRow;
import com.ezone.backend.dto.mattermost.MattermostIngestResponse;
import com.ezone.backend.dto.mattermost.MattermostJobCandidateResponse;
import com.ezone.backend.dto.mattermost.MattermostWebhookRequest;
import com.ezone.backend.mapper.MattermostMapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.atomic.AtomicLong;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MattermostIngestionService {

    private static final Pattern URL_PATTERN = Pattern.compile("https?://\\S+");
    private static final Pattern BRACKET_COMPANY_PATTERN = Pattern.compile("^\\[([^\\]]+)]\\s*(.+)$");
    private static final Pattern DEADLINE_PATTERN = Pattern.compile(
        "(D-\\d+|\\d{4}\\.\\d{2}\\.\\d{2}|\\d{1,2}/\\d{1,2}\\([^)]+\\)|상시/수시/채용 시 마감 공고)"
    );
    private static final Pattern JOB_LISTING_LINE_PATTERN = Pattern.compile("^(.+?)\\s*/\\s*(.+?)\\s*/\\s*(-\\s*.+)$");
    private static final Set<String> REVIEW_STATUSES = Set.of("APPROVED", "REJECTED");
    private static final Set<String> NON_RECRUITMENT_URL_HOST_PARTS = Set.of(
        "youtu.be",
        "youtube.com",
        "forms.gle",
        "docs.google.com",
        "work24.go.kr"
    );

    @Autowired(required = false)
    private MattermostMapper mattermostMapper;

    @Autowired(required = false)
    private P1WorkspaceMapperSupport workspaceSupport;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final AtomicLong inMemoryIds = new AtomicLong(1);
    private final List<MattermostMessageRow> inMemoryMessages = new ArrayList<>();
    private final List<MattermostParsedJobPostRow> inMemoryCandidates = new ArrayList<>();

    @Transactional
    public MattermostIngestResponse ingest(MattermostWebhookRequest request) {
        Optional<Long> existingMessageId = findMessageId(request.messageId());
        if (existingMessageId.isPresent()) {
            return new MattermostIngestResponse(existingMessageId.get(), "DUPLICATE", "RAW_SAVED", false, null);
        }

        ParsedMattermostMessage parsed = parse(request);
        MattermostMessageRow message = new MattermostMessageRow();
        message.setChannelId(request.channelId());
        message.setMessageId(request.messageId());
        message.setSenderName(request.senderName());
        message.setRawText(safeText(request.text()));
        message.setRawPayloadJson(toJson(request.rawPayload()));
        message.setMessageType(parsed.messageType());
        message.setParseStatus(parsed.parseStatus());
        insertMessage(message);

        MattermostParsedJobPostRow firstCandidate = null;
        for (ParsedJobCandidate parsedCandidate : parsed.candidates()) {
            MattermostParsedJobPostRow candidate = new MattermostParsedJobPostRow();
            candidate.setMessageId(message.getId());
            candidate.setCompanyName(parsedCandidate.companyName());
            candidate.setTitle(parsedCandidate.title());
            candidate.setUrl(parsedCandidate.url());
            candidate.setDeadlineLabel(parsedCandidate.deadlineLabel());
            candidate.setReviewStatus("NEEDS_REVIEW");
            insertParsedJobPost(candidate);
            if (firstCandidate == null) {
                firstCandidate = candidate;
            }
        }

        return new MattermostIngestResponse(
            message.getId(),
            message.getMessageType(),
            message.getParseStatus(),
            firstCandidate != null,
            firstCandidate == null ? null : firstCandidate.getId()
        );
    }

    public List<MattermostJobCandidateResponse> listCandidates(String reviewStatus) {
        String status = reviewStatus == null || reviewStatus.isBlank() ? "NEEDS_REVIEW" : reviewStatus;
        List<MattermostParsedJobPostRow> rows = mattermostMapper == null
            ? inMemoryCandidates.stream().filter(row -> status.equals(row.getReviewStatus())).toList()
            : mattermostMapper.listParsedJobPosts(status);
        return rows.stream().map(this::toCandidateResponse).toList();
    }

    @Transactional
    public MattermostJobCandidateResponse reviewCandidate(Long id, String reviewStatus, Long reviewerUserId) {
        if (!REVIEW_STATUSES.contains(reviewStatus)) {
            throw new IllegalArgumentException("Unsupported Mattermost review status");
        }
        MattermostParsedJobPostRow candidate = findParsedJobPost(id)
            .orElseThrow(() -> new IllegalArgumentException("Mattermost job candidate not found"));
        Long promotedJobId = candidate.getPromotedJobId();
        if ("APPROVED".equals(reviewStatus) && promotedJobId == null) {
            promotedJobId = promoteCandidate(candidate);
        }
        markReviewed(id, reviewStatus, reviewerUserId, promotedJobId);
        candidate.setReviewStatus(reviewStatus);
        candidate.setReviewerUserId(reviewerUserId);
        candidate.setPromotedJobId(promotedJobId);
        return toCandidateResponse(candidate);
    }

    private ParsedMattermostMessage parse(MattermostWebhookRequest request) {
        String text = safeText(request.text());
        String lower = text.toLowerCase(Locale.ROOT);
        if (text.contains("취업성공후기") || text.contains("합격 후기") || text.contains("합격후기")) {
            return ParsedMattermostMessage.ignored("SUCCESS_STORY");
        }
        if (text.isBlank() && request.attachments() != null && !request.attachments().isEmpty()) {
            return ParsedMattermostMessage.filePending();
        }

        List<ParsedJobCandidate> candidates = extractJobCandidates(text);
        if (!candidates.isEmpty()) {
            return ParsedMattermostMessage.jobPosting(candidates);
        }

        if (isJobRelatedNotice(text, lower)) {
            return ParsedMattermostMessage.ignored("JOB_RELATED_NOTICE");
        }

        Matcher urlMatcher = URL_PATTERN.matcher(text);
        if (!urlMatcher.find() || !hasJobKeyword(text, lower)) {
            return ParsedMattermostMessage.ignored("ANNOUNCEMENT");
        }

        String url = cleanUrl(urlMatcher.group());
        if (!isRecruitmentUrl(url)) {
            return ParsedMattermostMessage.ignored("JOB_RELATED_NOTICE");
        }

        String withoutUrl = text.replace(urlMatcher.group(), "").trim();
        String companyName = "미확인";
        String title = withoutUrl;
        Matcher bracketMatcher = BRACKET_COMPANY_PATTERN.matcher(withoutUrl);
        if (bracketMatcher.find()) {
            companyName = bracketMatcher.group(1).trim();
            title = bracketMatcher.group(2).trim();
        }
        String deadlineLabel = extractDeadline(text).orElse("미정");
        title = title.replace("마감 " + deadlineLabel, "").trim();
        return ParsedMattermostMessage.jobPosting(List.of(new ParsedJobCandidate(companyName, title, url, deadlineLabel)));
    }

    private List<ParsedJobCandidate> extractJobCandidates(String text) {
        List<String> lines = text.lines()
            .map(String::trim)
            .filter(line -> !line.isBlank())
            .toList();
        List<ParsedJobCandidate> candidates = new ArrayList<>();
        for (int index = 0; index < lines.size(); index++) {
            String listingLine = normalizeListingLine(lines.get(index));
            Matcher listingMatcher = JOB_LISTING_LINE_PATTERN.matcher(listingLine);
            if (!listingMatcher.find()) {
                continue;
            }
            Optional<String> url = findRecruitmentUrlNear(lines, index);
            if (url.isEmpty()) {
                continue;
            }
            String companyName = listingMatcher.group(1).trim();
            String title = listingMatcher.group(2).trim();
            String deadlineLabel = normalizeDeadline(listingMatcher.group(3));
            if (companyName.isBlank() || title.isBlank()) {
                continue;
            }
            candidates.add(new ParsedJobCandidate(companyName, title, url.get(), deadlineLabel));
        }
        return candidates;
    }

    private Optional<String> findRecruitmentUrlNear(List<String> lines, int listingLineIndex) {
        int lastIndex = Math.min(lines.size() - 1, listingLineIndex + 2);
        for (int index = listingLineIndex; index <= lastIndex; index++) {
            Matcher matcher = URL_PATTERN.matcher(lines.get(index));
            if (matcher.find()) {
                String url = cleanUrl(matcher.group());
                if (isRecruitmentUrl(url)) {
                    return Optional.of(url);
                }
            }
        }
        return Optional.empty();
    }

    private String normalizeListingLine(String line) {
        return line
            .replaceAll("(:[^:\\s]+:\\s*)+", "")
            .replaceAll("^[\\s\\p{Punct}]+", "")
            .trim();
    }

    private String normalizeDeadline(String value) {
        return value.replaceFirst("^-\\s*", "").trim();
    }

    private boolean isJobRelatedNotice(String text, String lower) {
        return text.contains("채용공고")
            || text.contains("채용설명회")
            || text.contains("취업특강")
            || text.contains("취뽀뉴스")
            || text.contains("채용 포지션")
            || lower.contains("job fair");
    }

    private boolean hasJobKeyword(String text, String lower) {
        return text.contains("채용")
            || text.contains("공고")
            || lower.contains("recruit")
            || lower.contains("career");
    }

    private boolean isRecruitmentUrl(String url) {
        String lower = url.toLowerCase(Locale.ROOT);
        return NON_RECRUITMENT_URL_HOST_PARTS.stream().noneMatch(lower::contains);
    }

    private Optional<String> extractDeadline(String text) {
        Matcher matcher = DEADLINE_PATTERN.matcher(text);
        return matcher.find() ? Optional.of(matcher.group(1)) : Optional.empty();
    }

    private Optional<Long> findMessageId(String messageId) {
        if (mattermostMapper != null) {
            return mattermostMapper.findMessageId(messageId);
        }
        return inMemoryMessages.stream()
            .filter(row -> row.getMessageId().equals(messageId))
            .map(MattermostMessageRow::getId)
            .findFirst();
    }

    private void insertMessage(MattermostMessageRow row) {
        if (mattermostMapper != null) {
            mattermostMapper.insertMessage(row);
            return;
        }
        row.setId(inMemoryIds.getAndIncrement());
        inMemoryMessages.add(row);
    }

    private void insertParsedJobPost(MattermostParsedJobPostRow row) {
        if (mattermostMapper != null) {
            mattermostMapper.insertParsedJobPost(row);
            return;
        }
        row.setId(inMemoryIds.getAndIncrement());
        inMemoryCandidates.add(row);
    }

    private Optional<MattermostParsedJobPostRow> findParsedJobPost(Long id) {
        if (mattermostMapper != null) {
            return mattermostMapper.findParsedJobPost(id);
        }
        return inMemoryCandidates.stream().filter(row -> row.getId().equals(id)).findFirst();
    }

    private void markReviewed(Long id, String reviewStatus, Long reviewerUserId, Long promotedJobId) {
        if (mattermostMapper != null) {
            mattermostMapper.markParsedJobPostReviewed(id, reviewStatus, reviewerUserId, promotedJobId);
        }
    }

    private Long promoteCandidate(MattermostParsedJobPostRow candidate) {
        if (workspaceSupport == null) {
            return candidate.getPromotedJobId();
        }
        return workspaceSupport.promoteMattermostJob(candidate);
    }

    private MattermostJobCandidateResponse toCandidateResponse(MattermostParsedJobPostRow row) {
        return new MattermostJobCandidateResponse(
            row.getId(),
            row.getCompanyName(),
            row.getTitle(),
            row.getUrl(),
            row.getDeadlineLabel(),
            row.getReviewStatus(),
            row.getPromotedJobId()
        );
    }

    private String safeText(String value) {
        return value == null ? "" : value.trim();
    }

    private String cleanUrl(String url) {
        return url.replaceAll("[\\]),.]+$", "");
    }

    private String toJson(Map<String, Object> payload) {
        try {
            return objectMapper.writeValueAsString(payload == null ? Map.of() : payload);
        } catch (JsonProcessingException exception) {
            return "{}";
        }
    }

    private record ParsedMattermostMessage(
        String messageType,
        String parseStatus,
        List<ParsedJobCandidate> candidates
    ) {
        static ParsedMattermostMessage jobPosting(List<ParsedJobCandidate> candidates) {
            return new ParsedMattermostMessage("JOB_POSTING", "PARSED", candidates);
        }

        static ParsedMattermostMessage ignored(String messageType) {
            return new ParsedMattermostMessage(messageType, "IGNORED", List.of());
        }

        static ParsedMattermostMessage filePending() {
            return new ParsedMattermostMessage("FILE_ONLY", "FILE_PENDING", List.of());
        }
    }

    private record ParsedJobCandidate(
        String companyName,
        String title,
        String url,
        String deadlineLabel
    ) {
    }
}
