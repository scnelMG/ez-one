package com.ezone.backend.service;

import com.ezone.backend.domain.persistence.MattermostParsedJobPostRow;
import java.util.Optional;

public interface AiJobRecommendationClient {

    Optional<AiRecommendationSignal> recommend(MattermostParsedJobPostRow row);

    record AiRecommendationSignal(int score, String reason) {
    }
}
