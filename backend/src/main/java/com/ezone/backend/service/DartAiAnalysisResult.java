package com.ezone.backend.service;

import com.ezone.backend.dto.dart.DartAnalysisContentResponse;

public record DartAiAnalysisResult(
    String model,
    DartAnalysisContentResponse content
) {
}
