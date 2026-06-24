package com.ezone.backend.service;

import com.ezone.backend.domain.persistence.MattermostParsedJobPostRow;
import java.util.Optional;

public interface AiJobRecommendationClient {

    default Optional<AiRecommendationSignal> recommend(MattermostParsedJobPostRow row) {
        return recommend(row, UserRecommendationProfile.empty());
    }

    Optional<AiRecommendationSignal> recommend(MattermostParsedJobPostRow row, UserRecommendationProfile profile);

    record AiRecommendationSignal(int score, String reason) {
    }
}
