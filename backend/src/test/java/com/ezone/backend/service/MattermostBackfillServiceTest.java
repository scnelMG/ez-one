package com.ezone.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ezone.backend.dto.mattermost.MattermostIngestResponse;
import com.ezone.backend.dto.mattermost.MattermostWebhookRequest;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

class MattermostBackfillServiceTest {

    private final MattermostIngestionService ingestionService = Mockito.mock(MattermostIngestionService.class);
    private final MattermostBackfillService service = new MattermostBackfillService(ingestionService);

    @Test
    void backfillSplitsPastedChannelTextIntoDeterministicWebhookRequests() {
        String pastedText = """
            1월 13일
            시스템
            오전 11:52
            @홍길동 님이 채널에 들어왔습니다.

            김담당 프로[취업]
            오후 3:26
            @all

            :hhappy_pang: 1월 3주차 IT인재 채용공고 :hhappy_pang:
            [SW개발직무]
             :meow_rolling_back: 보스반도체 / SOC RTL Design Engineer [신입] / -01/26(월)
            https://jumpit.saramin.co.kr/position/52664559
            """;
        when(ingestionService.ingest(Mockito.any()))
            .thenReturn(new MattermostIngestResponse(1L, "JOB_POSTING", "PARSED", true, 10L));

        MattermostBackfillService.BackfillResult result = service.backfill(
            "employment-info",
            "[취업] 취업정보",
            pastedText
        );

        assertThat(result.attemptedMessages()).isEqualTo(1);
        assertThat(result.duplicateMessages()).isZero();

        ArgumentCaptor<MattermostWebhookRequest> captor = ArgumentCaptor.forClass(MattermostWebhookRequest.class);
        verify(ingestionService).ingest(captor.capture());

        MattermostWebhookRequest request = captor.getValue();
        assertThat(request.channelId()).isEqualTo("employment-info");
        assertThat(request.senderName()).isEqualTo("김담당 프로[취업]");
        assertThat(request.messageId()).startsWith("backfill-employment-info-");
        assertThat(request.postedAt()).isEqualTo("2026-01-13T15:26:00");
        assertThat(request.text()).contains("보스반도체 / SOC RTL Design Engineer");
        assertThat(request.rawPayload()).containsEntry("backfillChannelName", "[취업] 취업정보");
    }

    @Test
    void backfillCountsDuplicateResponsesWithoutFailing() {
        String pastedText = """
            김담당 프로[취업]
            오후 3:26
            채용공고 안내
            """;
        when(ingestionService.ingest(Mockito.any()))
            .thenReturn(new MattermostIngestResponse(99L, "DUPLICATE", "RAW_SAVED", false, null));

        MattermostBackfillService.BackfillResult result = service.backfill(
            "employment-info",
            "[취업] 취업정보",
            pastedText
        );

        assertThat(result.attemptedMessages()).isEqualTo(1);
        assertThat(result.duplicateMessages()).isEqualTo(1);
    }

    @Test
    void backfillUsesConfiguredYearForHistoricalMattermostPosts() {
        MattermostBackfillService serviceWithHistoricalYear = new MattermostBackfillService(ingestionService, 2025);
        String pastedText = """
            12월 31일
            김담당 프로[취업]
            오후 11:59
            연말 채용공고 안내
            """;
        when(ingestionService.ingest(Mockito.any()))
            .thenReturn(new MattermostIngestResponse(1L, "RAW_ONLY", "RAW_SAVED", false, null));

        serviceWithHistoricalYear.backfill("employment-info", "[취업] 취업정보", pastedText);

        ArgumentCaptor<MattermostWebhookRequest> captor = ArgumentCaptor.forClass(MattermostWebhookRequest.class);
        verify(ingestionService).ingest(captor.capture());

        assertThat(captor.getValue().postedAt()).isEqualTo("2025-12-31T23:59:00");
    }
}
