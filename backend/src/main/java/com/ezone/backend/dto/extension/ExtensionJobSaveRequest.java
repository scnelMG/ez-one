package com.ezone.backend.dto.extension;

import java.util.List;

public record ExtensionJobSaveRequest(
    String companyName,
    String positionTitle,
    String deadlineLabel,
    String sourceUrl,
    String logoUrl,
    List<String> selectedRoles,
    List<ExtensionEssayQuestionRequest> essayQuestions
) {
    public ExtensionJobSaveRequest {
        selectedRoles = selectedRoles == null ? List.of() : selectedRoles;
        essayQuestions = essayQuestions == null ? List.of() : essayQuestions;
    }
}
