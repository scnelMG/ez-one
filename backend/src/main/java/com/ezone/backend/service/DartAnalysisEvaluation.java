package com.ezone.backend.service;

import com.ezone.backend.dto.dart.DartAnalysisContentResponse;
import java.util.List;

public record DartAnalysisEvaluation(
    boolean passed,
    int score,
    DartAnalysisContentResponse content,
    List<String> notes
) {
}
