package com.ezone.backend.dto.mattermost;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.NotBlank;

public record MattermostReviewRequest(
    @NotBlank
    @Pattern(regexp = "APPROVED|REJECTED") String reviewStatus
) {
}
