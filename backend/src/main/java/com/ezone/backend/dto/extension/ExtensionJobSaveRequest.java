package com.ezone.backend.dto.extension;

import java.util.List;
import java.util.Map;

public record ExtensionJobSaveRequest(
    String companyName,
    String positionTitle,
    String deadlineLabel,
    String sourceUrl,
    String logoUrl,
    List<String> selectedRoles,
    List<ExtensionEssayQuestionRequest> essayQuestions,
    Map<String, List<ExtensionEssayQuestionRequest>> roleEssayQuestions
) {
    public ExtensionJobSaveRequest {
        selectedRoles = selectedRoles == null ? List.of() : selectedRoles;
        essayQuestions = essayQuestions == null ? List.of() : essayQuestions;
        roleEssayQuestions = roleEssayQuestions == null ? Map.of() : roleEssayQuestions;
    }
}
