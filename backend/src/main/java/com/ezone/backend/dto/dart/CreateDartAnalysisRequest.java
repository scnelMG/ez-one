package com.ezone.backend.dto.dart;

import jakarta.validation.constraints.NotBlank;
import java.util.List;

public record CreateDartAnalysisRequest(
    @NotBlank String rceptNo,
    @NotBlank String reportName,
    String companyName,
    String positionTitle,
    List<String> essayQuestions,
    String documentText
) {
}
