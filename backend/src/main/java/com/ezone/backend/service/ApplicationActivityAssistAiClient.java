package com.ezone.backend.service;

import com.ezone.backend.dto.extension.ApplicationActivityAssistRequest;
import com.ezone.backend.dto.extension.ApplicationActivityRecommendation;
import java.util.List;
import java.util.Optional;

public interface ApplicationActivityAssistAiClient {

    Optional<List<ApplicationActivityRecommendation>> recommend(
        ApplicationActivityAssistRequest request,
        List<ApplicationActivityAssistService.ActivityCandidate> candidates,
        int maxItems,
        int detailLimit,
        String detailLimitUnit
    );
}
