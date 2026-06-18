package com.ezone.backend.service;

import java.util.List;

public record DartAiAnalysisRequest(
    String rceptNo,
    String reportName,
    String companyName,
    String positionTitle,
    List<String> essayQuestions,
    String documentText
) {
}
