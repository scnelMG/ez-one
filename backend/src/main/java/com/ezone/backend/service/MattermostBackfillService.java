package com.ezone.backend.service;

import com.ezone.backend.dto.mattermost.MattermostIngestResponse;
import com.ezone.backend.dto.mattermost.MattermostWebhookRequest;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Year;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class MattermostBackfillService {

    private static final Pattern DATE_LINE_PATTERN = Pattern.compile("(\\d{1,2})월\\s*(\\d{1,2})일");
    private static final Pattern TIME_LINE_PATTERN = Pattern.compile("(오전|오후)\\s*(\\d{1,2}):(\\d{2})");
    private static final DateTimeFormatter POSTED_AT_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");

    private final MattermostIngestionService ingestionService;
    private final int backfillYear;

    @Autowired
    public MattermostBackfillService(
        MattermostIngestionService ingestionService,
        @Value("${mattermost.backfill.year:0}") int configuredBackfillYear
    ) {
        this.ingestionService = ingestionService;
        this.backfillYear = configuredBackfillYear > 0 ? configuredBackfillYear : Year.now().getValue();
    }

    MattermostBackfillService(MattermostIngestionService ingestionService) {
        this(ingestionService, 0);
    }

    public BackfillResult backfill(String channelId, String channelName, String pastedText) {
        List<BackfillMessage> messages = splitMessages(pastedText);
        int duplicates = 0;
        for (BackfillMessage message : messages) {
            MattermostIngestResponse response = ingestionService.ingest(toRequest(channelId, channelName, message));
            if ("DUPLICATE".equals(response.messageType())) {
                duplicates++;
            }
        }
        return new BackfillResult(messages.size(), duplicates);
    }

    private MattermostWebhookRequest toRequest(String channelId, String channelName, BackfillMessage message) {
        return new MattermostWebhookRequest(
            null,
            channelId,
            "backfill-%s-%s".formatted(safeId(channelId), hash(channelId, message.senderName(), message.text())),
            message.senderName(),
            message.text(),
            List.of(),
            Map.of(
                "backfill", true,
                "backfillChannelName", channelName
            ),
            message.postedAt()
        );
    }

    private List<BackfillMessage> splitMessages(String pastedText) {
        if (pastedText == null || pastedText.isBlank()) {
            return List.of();
        }
        String[] lines = pastedText.replace("\r\n", "\n").replace('\r', '\n').split("\n");
        List<BackfillMessage> messages = new ArrayList<>();
        String senderName = null;
        LocalDate currentDate = null;
        String postedAt = null;
        List<String> body = new ArrayList<>();

        for (int index = 0; index < lines.length; index++) {
            String line = lines[index].trim();
            String nextLine = index + 1 < lines.length ? lines[index + 1].trim() : "";
            LocalDate parsedDate = parseDateLine(line);
            if (parsedDate != null) {
                currentDate = parsedDate;
                if (senderName != null) {
                    body.add(lines[index]);
                }
                continue;
            }
            if (isSenderLine(line, nextLine)) {
                flush(messages, senderName, postedAt, body);
                senderName = line;
                postedAt = parsePostedAt(currentDate, nextLine);
                body = new ArrayList<>();
                index++;
                continue;
            }
            if (senderName != null) {
                body.add(lines[index]);
            }
        }
        flush(messages, senderName, postedAt, body);
        return messages;
    }

    private void flush(List<BackfillMessage> messages, String senderName, String postedAt, List<String> body) {
        if (senderName == null || isSystemSender(senderName)) {
            return;
        }
        String text = String.join("\n", body).trim();
        if (text.isBlank()) {
            return;
        }
        messages.add(new BackfillMessage(senderName, text, postedAt));
    }

    private boolean isSenderLine(String line, String nextLine) {
        return !line.isBlank()
            && !isSystemSender(line)
            && !isDateLine(line)
            && isTimeLine(nextLine);
    }

    private boolean isSystemSender(String line) {
        return "시스템".equals(line) || line.contains("?쒖뒪");
    }

    private boolean isDateLine(String line) {
        return line.matches("\\d{1,2}월\\s*\\d{1,2}일") || line.matches("\\d{1,2}\\?\\?\\d{1,2}\\?\\?");
    }

    private boolean isTimeLine(String line) {
        return line.length() <= 20
            && (line.contains("오전")
                || line.contains("오후")
                || line.contains("?ㅼ쟾")
                || line.contains("?ㅽ썑")
                || line.matches(".*\\d{1,2}:\\d{2}.*"));
    }

    private LocalDate parseDateLine(String line) {
        Matcher matcher = DATE_LINE_PATTERN.matcher(line);
        if (!matcher.matches()) {
            return null;
        }
        return LocalDate.of(
            backfillYear,
            Integer.parseInt(matcher.group(1)),
            Integer.parseInt(matcher.group(2))
        );
    }

    private String parsePostedAt(LocalDate currentDate, String timeLine) {
        if (currentDate == null) {
            return null;
        }
        Matcher matcher = TIME_LINE_PATTERN.matcher(timeLine);
        if (!matcher.find()) {
            return null;
        }
        int hour = Integer.parseInt(matcher.group(2));
        int minute = Integer.parseInt(matcher.group(3));
        if ("오후".equals(matcher.group(1)) && hour < 12) {
            hour += 12;
        } else if ("오전".equals(matcher.group(1)) && hour == 12) {
            hour = 0;
        }
        return LocalDateTime.of(currentDate, java.time.LocalTime.of(hour, minute)).format(POSTED_AT_FORMAT);
    }

    private String safeId(String value) {
        return value == null ? "unknown" : value.replaceAll("[^A-Za-z0-9_-]+", "-");
    }

    private String hash(String channelId, String senderName, String text) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest((channelId + "\n" + senderName + "\n" + text).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashed, 0, 8);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available", exception);
        }
    }

    public record BackfillResult(
        int attemptedMessages,
        int duplicateMessages
    ) {
    }

    private record BackfillMessage(
        String senderName,
        String text,
        String postedAt
    ) {
    }
}
