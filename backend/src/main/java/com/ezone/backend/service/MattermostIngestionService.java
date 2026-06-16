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
    private static final Pattern DEADLINE_PATTERN = Pattern.compile("(D-\\d+|\\d{4}\\.\\d{2}\\.\\d{2}|오늘)");
    private static final Set<String> REVIEW_STATUSES = Set.of("APPROVED", "REJECTED");

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

        MattermostParsedJobPostRow candidate = null;
        if (parsed.createCandidate()) {
            candidate = new MattermostParsedJobPostRow();
            candidate.setMessageId(message.getId());
            candidate.setCompanyName(parsed.companyName());
            candidate.setTitle(parsed.title());
            candidate.setUrl(parsed.url());
            candidate.setDeadlineLabel(parsed.deadlineLabel());
            candidate.setReviewStatus("NEEDS_REVIEW");
            insertParsedJobPost(candidate);
        }

        return new MattermostIngestResponse(
            message.getId(),
            message.getMessageType(),
            message.getParseStatus(),
            candidate != null,
            candidate == null ? null : candidate.getId()
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
        if (lower.contains("취업성공후기") || lower.contains("합격 후기") || lower.contains("합격후기")) {
            return ParsedMattermostMessage.ignored("SUCCESS_STORY");
        }
        if (text.isBlank() && request.attachments() != null && !request.attachments().isEmpty()) {
            return ParsedMattermostMessage.filePending();
        }
        Matcher urlMatcher = URL_PATTERN.matcher(text);
        boolean hasUrl = urlMatcher.find();
        boolean hasJobKeyword = text.contains("채용") || lower.contains("recruit") || lower.contains("career");
        if (!hasUrl || !hasJobKeyword) {
            return ParsedMattermostMessage.ignored("ANNOUNCEMENT");
        }

        String url = cleanUrl(urlMatcher.group());
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
        return ParsedMattermostMessage.jobPosting(companyName, title, url, deadlineLabel);
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
        return url.replaceAll("[),.]+$", "");
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
        boolean createCandidate,
        String companyName,
        String title,
        String url,
        String deadlineLabel
    ) {
        static ParsedMattermostMessage jobPosting(String companyName, String title, String url, String deadlineLabel) {
            return new ParsedMattermostMessage(
                "JOB_POSTING",
                "PARSED",
                true,
                companyName,
                title,
                url,
                deadlineLabel
            );
        }

        static ParsedMattermostMessage ignored(String messageType) {
            return new ParsedMattermostMessage(messageType, "IGNORED", false, null, null, null, null);
        }

        static ParsedMattermostMessage filePending() {
            return new ParsedMattermostMessage("FILE_ONLY", "FILE_PENDING", false, null, null, null, null);
        }
    }
}
