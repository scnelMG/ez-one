package com.ezone.backend.service;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ezone.backend.domain.persistence.MattermostParsedJobPostRow;
import com.ezone.backend.mapper.MattermostMapper;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

class MattermostRecommendationScoringServiceTest {

    private final MattermostMapper mattermostMapper = Mockito.mock(MattermostMapper.class);
    private final AiJobRecommendationClient aiClient = Mockito.mock(AiJobRecommendationClient.class);
    private final MattermostRecommendationScoringService service = new MattermostRecommendationScoringService(
        mattermostMapper,
        Optional.of(aiClient)
    );

    @Test
    void scoreCandidatesPersistsReadyAiScoreForMattermostCandidate() {
        MattermostParsedJobPostRow candidate = candidate(9L, "Line", "Backend Engineer", "D-5");
        UserRecommendationProfile profile = UserRecommendationProfile.empty();
        when(aiClient.recommend(candidate, profile))
            .thenReturn(Optional.of(new AiJobRecommendationClient.AiRecommendationSignal(87, "백엔드 직무와 마감 정보가 명확해 우선 검토할 만합니다.")));

        service.scoreCandidates(1L, List.of(candidate), profile, "gms:test:profile-abc");

        verify(mattermostMapper).upsertRecommendationScore(
            1L,
            9L,
            87,
            true,
            "백엔드 직무와 마감 정보가 명확해 우선 검토할 만합니다.",
            "[]",
            "gms:test:profile-abc",
            "READY"
        );
    }

    @Test
    void scoreCandidatesMarksFailedWhenAiDoesNotReturnScore() {
        MattermostParsedJobPostRow candidate = candidate(10L, "Unknown", "Recruiting", "상시 채용");
        UserRecommendationProfile profile = UserRecommendationProfile.empty();
        when(aiClient.recommend(candidate, profile)).thenReturn(Optional.empty());

        service.scoreCandidates(1L, List.of(candidate), profile, "gms:test:profile-abc");

        verify(mattermostMapper).upsertRecommendationScore(
            1L,
            10L,
            null,
            false,
            "AI 추천도 계산에 실패했습니다. 잠시 후 다시 시도합니다.",
            "[]",
            "gms:test:profile-abc",
            "FAILED"
        );
    }

    private MattermostParsedJobPostRow candidate(Long id, String companyName, String title, String deadlineLabel) {
        MattermostParsedJobPostRow row = new MattermostParsedJobPostRow();
        row.setId(id);
        row.setCompanyName(companyName);
        row.setTitle(title);
        row.setDeadlineLabel(deadlineLabel);
        row.setUrl("https://careers.example.com/jobs/" + id);
        return row;
    }
}
