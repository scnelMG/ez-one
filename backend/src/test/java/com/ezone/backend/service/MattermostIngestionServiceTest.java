package com.ezone.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ezone.backend.domain.persistence.MattermostMessageRow;
import com.ezone.backend.domain.persistence.MattermostParsedJobPostRow;
import com.ezone.backend.dto.mattermost.MattermostWebhookRequest;
import com.ezone.backend.mapper.MattermostMapper;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class MattermostIngestionServiceTest {

    @Mock
    private MattermostMapper mattermostMapper;

    @Mock
    private P1WorkspaceMapperSupport workspaceSupport;

    @InjectMocks
    private MattermostIngestionService service;

    @Test
    void ingestStoresRawMessageAndCreatesJobCandidateForJobPosting() {
        MattermostWebhookRequest request = new MattermostWebhookRequest(
            null,
            "jobs-channel",
            "mm-101",
            "recruiter",
            "[네이버] Backend Engineer 채용 https://recruit.navercorp.com/jobs/101 마감 D-7",
            List.of(),
            Map.of("team", "employment")
        );
        when(mattermostMapper.findMessageId("mm-101")).thenReturn(Optional.empty());
        doAnswer(invocation -> {
            MattermostMessageRow row = invocation.getArgument(0);
            row.setId(10L);
            return null;
        }).when(mattermostMapper).insertMessage(any());

        var response = service.ingest(request);

        assertThat(response.createdParsedJobPost()).isTrue();
        assertThat(response.parseStatus()).isEqualTo("PARSED");
        verify(mattermostMapper).insertMessage(argThat(row ->
            "JOB_POSTING".equals(row.getMessageType())
                && "PARSED".equals(row.getParseStatus())
                && row.getRawText().contains("Backend Engineer")
        ));
        verify(mattermostMapper).insertParsedJobPost(argThat(row ->
            row.getMessageId().equals(10L)
                && "네이버".equals(row.getCompanyName())
                && "Backend Engineer 채용".equals(row.getTitle())
                && "https://recruit.navercorp.com/jobs/101".equals(row.getUrl())
                && "D-7".equals(row.getDeadlineLabel())
                && "NEEDS_REVIEW".equals(row.getReviewStatus())
        ));
    }

    @Test
    void ingestCreatesCandidatesOnlyForWeeklyJobListingRowsWithRecruitmentUrls() {
        MattermostWebhookRequest request = new MattermostWebhookRequest(
            null,
            "employment-info",
            "mm-weekly-1",
            "career-center",
            """
            :hhappy_pang: 1월 3주차 IT인재 채용공고 :hhappy_pang:
            안녕하세요. SSAFY취업지원센터입니다.
            [SW개발직무]
             :meow_rolling_back: 보스반도체 / SOC RTL Design Engineer [신입] / -01/26(월)
            https://jumpit.saramin.co.kr/position/52664559

             :meow_rolling_back: 채널코퍼레이션 / [채널톡] Software Engineer (Backend - Meet) / -상시/수시/채용 시 마감 공고
            https://www.wanted.co.kr/wd/324638

            :youtube_icon: SSAFY 【한국문화정보원】 온라인 채용설명회 안내 :youtube_icon:
            모바일 접속 링크(실시간생중계) : https://youtu.be/wqyPNa7MShA
            """,
            List.of(),
            Map.of("channel_name", "[취업] 취업정보")
        );
        when(mattermostMapper.findMessageId("mm-weekly-1")).thenReturn(Optional.empty());
        doAnswer(invocation -> {
            MattermostMessageRow row = invocation.getArgument(0);
            row.setId(20L);
            return null;
        }).when(mattermostMapper).insertMessage(any());

        var response = service.ingest(request);

        assertThat(response.createdParsedJobPost()).isTrue();
        assertThat(response.parseStatus()).isEqualTo("PARSED");

        ArgumentCaptor<MattermostParsedJobPostRow> captor = ArgumentCaptor.forClass(MattermostParsedJobPostRow.class);
        verify(mattermostMapper, times(2)).insertParsedJobPost(captor.capture());
        assertThat(captor.getAllValues())
            .extracting(MattermostParsedJobPostRow::getCompanyName)
            .containsExactly("보스반도체", "채널코퍼레이션");
        assertThat(captor.getAllValues())
            .extracting(MattermostParsedJobPostRow::getUrl)
            .containsExactly(
                "https://jumpit.saramin.co.kr/position/52664559",
                "https://www.wanted.co.kr/wd/324638"
            );
    }

    @Test
    void ingestStoresRecruitmentBriefingNoticeRawOnly() {
        MattermostWebhookRequest request = new MattermostWebhookRequest(
            null,
            "employment-notice",
            "mm-notice-briefing",
            "career-center",
            """
            :youtube_icon: SSAFY 【한국문화정보원】 온라인 채용설명회 안내 :youtube_icon:
            SSAFY 온라인 채용설명회 통해 【한국문화정보원】 에서 함께할 인재를 찾습니다!
            채용설명회를 통해 기업 소개, 직무 이야기, 실제 채용 프로세스까지 직접 확인해보세요.
            모바일 접속 링크(실시간생중계) : https://youtu.be/wqyPNa7MShA
            """,
            List.of(),
            Map.of("channel_name", "[취업] 공지사항")
        );
        when(mattermostMapper.findMessageId("mm-notice-briefing")).thenReturn(Optional.empty());
        doAnswer(invocation -> {
            MattermostMessageRow row = invocation.getArgument(0);
            row.setId(21L);
            return null;
        }).when(mattermostMapper).insertMessage(any());

        var response = service.ingest(request);

        assertThat(response.createdParsedJobPost()).isFalse();
        assertThat(response.messageType()).isEqualTo("JOB_RELATED_NOTICE");
        assertThat(response.parseStatus()).isEqualTo("IGNORED");
        verify(mattermostMapper, never()).insertParsedJobPost(any());
    }

    @Test
    void ingestStoresHiddenLinkJobNoticeRawOnlyUntilUrlIsVisible() {
        MattermostWebhookRequest request = new MattermostWebhookRequest(
            null,
            "employment-info",
            "mm-hidden-link",
            "career-center",
            """
            [채용공고] AK아이에스
            안녕하세요. SSAFY취업지원센터입니다. AK아이에스에서 신입사원 공개채용중 입니다.
            채용공고
            AK아이에스 공고 확인
            채용 포지션
            웹/앱 개발 및 운영
            지원서 접수
            1월 14일(수) ~ 1월 28일(수) 23:59 까지
            """,
            List.of(),
            Map.of("channel_name", "[취업] 취업정보")
        );
        when(mattermostMapper.findMessageId("mm-hidden-link")).thenReturn(Optional.empty());
        doAnswer(invocation -> {
            MattermostMessageRow row = invocation.getArgument(0);
            row.setId(22L);
            return null;
        }).when(mattermostMapper).insertMessage(any());

        var response = service.ingest(request);

        assertThat(response.createdParsedJobPost()).isFalse();
        assertThat(response.messageType()).isEqualTo("JOB_RELATED_NOTICE");
        assertThat(response.parseStatus()).isEqualTo("IGNORED");
        verify(mattermostMapper, never()).insertParsedJobPost(any());
    }

    @Test
    void ingestStoresSuccessStoryRawOnly() {
        MattermostWebhookRequest request = new MattermostWebhookRequest(
            null,
            "jobs-channel",
            "mm-102",
            "writer",
            "[SSAFY 취업성공후기] 삼성전자 합격 후기",
            List.of(),
            Map.of()
        );
        when(mattermostMapper.findMessageId("mm-102")).thenReturn(Optional.empty());
        doAnswer(invocation -> {
            MattermostMessageRow row = invocation.getArgument(0);
            row.setId(11L);
            return null;
        }).when(mattermostMapper).insertMessage(any());

        var response = service.ingest(request);

        assertThat(response.createdParsedJobPost()).isFalse();
        assertThat(response.parseStatus()).isEqualTo("IGNORED");
        verify(mattermostMapper).insertMessage(argThat(row ->
            "SUCCESS_STORY".equals(row.getMessageType())
                && "IGNORED".equals(row.getParseStatus())
        ));
        verify(mattermostMapper, never()).insertParsedJobPost(any());
    }

    @Test
    void approveCandidatePromotesMattermostJob() {
        MattermostParsedJobPostRow candidate = new MattermostParsedJobPostRow();
        candidate.setId(50L);
        candidate.setCompanyName("카카오");
        candidate.setTitle("Server Developer");
        candidate.setUrl("https://careers.kakao.com/jobs/50");
        candidate.setDeadlineLabel("D-5");
        when(mattermostMapper.findParsedJobPost(50L)).thenReturn(Optional.of(candidate));
        when(workspaceSupport.promoteMattermostJob(candidate)).thenReturn(9005L);

        var reviewed = service.reviewCandidate(50L, "APPROVED", 1L);

        assertThat(reviewed.reviewStatus()).isEqualTo("APPROVED");
        assertThat(reviewed.promotedJobId()).isEqualTo(9005L);
        verify(mattermostMapper).markParsedJobPostReviewed(50L, "APPROVED", 1L, 9005L);
    }

    @Test
    void approveCandidateDoesNotPromoteAgainWhenAlreadyPromoted() {
        MattermostParsedJobPostRow candidate = new MattermostParsedJobPostRow();
        candidate.setId(51L);
        candidate.setCompanyName("Kakao");
        candidate.setTitle("Server Developer");
        candidate.setUrl("https://careers.kakao.com/jobs/51");
        candidate.setDeadlineLabel("D-4");
        candidate.setPromotedJobId(9010L);
        when(mattermostMapper.findParsedJobPost(51L)).thenReturn(Optional.of(candidate));

        var reviewed = service.reviewCandidate(51L, "APPROVED", 1L);

        assertThat(reviewed.promotedJobId()).isEqualTo(9010L);
        verify(workspaceSupport, never()).promoteMattermostJob(any());
        verify(mattermostMapper).markParsedJobPostReviewed(51L, "APPROVED", 1L, 9010L);
    }

    @Test
    void reviewCandidateRejectsUnsupportedReviewStatus() {
        assertThatThrownBy(() -> service.reviewCandidate(50L, "PUBLISHED", 1L))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("Unsupported Mattermost review status");

        verify(mattermostMapper, never()).findParsedJobPost(any());
        verify(workspaceSupport, never()).promoteMattermostJob(any());
    }
}
