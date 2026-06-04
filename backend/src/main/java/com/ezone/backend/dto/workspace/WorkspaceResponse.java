package com.ezone.backend.dto.workspace;

import java.util.List;

public record WorkspaceResponse(
    Long id,
    Long basketJobId,
    String companyName,
    String positionTitle,
    String deadlineLabel,
    String statusLabel,
    String sourceUrl,
    List<EssayQuestionResponse> questions,
    List<ReferenceResponse> references
) {
}
