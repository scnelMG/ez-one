package com.ezone.backend.service;

import com.ezone.backend.domain.persistence.MattermostParsedJobPostRow;
import com.ezone.backend.mapper.MattermostMapper;
import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class MattermostRecommendationScoringService {

    static final String MODEL_VERSION = "gms:gpt-4.1-mini:mm-review-priority-v5";
    private static final Logger log = LoggerFactory.getLogger(MattermostRecommendationScoringService.class);
    private static final String EMPTY_EVIDENCE_JSON = "[]";

    private final MattermostMapper mattermostMapper;
    private final Optional<AiJobRecommendationClient> aiRecommendationClient;

    public MattermostRecommendationScoringService(
        MattermostMapper mattermostMapper,
        Optional<AiJobRecommendationClient> aiRecommendationClient
    ) {
        this.mattermostMapper = mattermostMapper;
        this.aiRecommendationClient = aiRecommendationClient;
    }

    @Async
    public void scoreCandidates(
        Long userId,
        List<MattermostParsedJobPostRow> candidates,
        UserRecommendationProfile profile,
        String modelVersion
    ) {
        if (userId == null || candidates == null || candidates.isEmpty()) {
            return;
        }
        if (aiRecommendationClient.isEmpty()) {
            return;
        }
        UserRecommendationProfile safeProfile = profile == null ? UserRecommendationProfile.empty() : profile;
        String safeModelVersion = safe(modelVersion).isBlank() ? MODEL_VERSION : modelVersion;
        for (MattermostParsedJobPostRow candidate : candidates) {
            scoreCandidate(userId, candidate, safeProfile, safeModelVersion);
        }
    }

    private void scoreCandidate(
        Long userId,
        MattermostParsedJobPostRow candidate,
        UserRecommendationProfile profile,
        String modelVersion
    ) {
        try {
            Optional<AiJobRecommendationClient.AiRecommendationSignal> signal =
                aiRecommendationClient.get().recommend(candidate, profile);
            if (signal.isPresent()) {
                AiJobRecommendationClient.AiRecommendationSignal value = signal.get();
                mattermostMapper.upsertRecommendationScore(
                    userId,
                    candidate.getId(),
                    value.score(),
                    value.score() >= 70,
                    value.reason(),
                    EMPTY_EVIDENCE_JSON,
                    modelVersion,
                    "READY"
                );
                return;
            }
            markFailed(userId, candidate.getId(), modelVersion);
        }
        catch (RuntimeException exception) {
            log.warn("Mattermost AI scoring failed for candidate {}: {}", candidate.getId(), exception.getMessage());
            markFailed(userId, candidate.getId(), modelVersion);
        }
    }

    private void markFailed(Long userId, Long candidateId, String modelVersion) {
        mattermostMapper.upsertRecommendationScore(
            userId,
            candidateId,
            null,
            false,
            "AI 추천도 계산에 실패했습니다. 잠시 후 다시 시도합니다.",
            EMPTY_EVIDENCE_JSON,
            modelVersion,
            "FAILED"
        );
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }
}
