package com.ezone.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.never;
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
    void ingestStoresSuccessStoryRawOnly() {
        MattermostWebhookRequest request = new MattermostWebhookRequest(
            "jobs-channel",
            "mm-102",
            "writer",
            "[SSAFY 취업성공후기] 5기 프론트엔드 개발자 합격 후기",
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
