package com.ezone.backend.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.ezone.backend.dto.mattermost.MattermostWebhookRequest;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class MattermostDeadlineParsingTest {

    @Test
    void weeklyListingDoesNotCollapseFlexibleDeadlinePhraseToAlwaysOpen() {
        MattermostIngestionService service = new MattermostIngestionService();
        MattermostWebhookRequest request = new MattermostWebhookRequest(
            null,
            "employment-info",
            "mm-flexible-deadline",
            "career-center",
            """
            [SW개발직무]
             :love_letter: 넛지헬스케어 / [병역특례 현역/보충역] 백엔드 개발자(Node.js) (서울) / -상시/수시/채용 시 마감 공고
            https://www.wanted.co.kr/wd/85836
            """,
            List.of(),
            Map.of("channel_name", "[취업] 취업정보")
        );

        service.ingest(request);

        assertThat(service.listCandidates("NEEDS_REVIEW"))
            .singleElement()
            .satisfies(candidate -> {
                assertThat(candidate.deadlineLabel()).isEqualTo("상시/수시/채용 시 마감 공고");
            });
    }
}
