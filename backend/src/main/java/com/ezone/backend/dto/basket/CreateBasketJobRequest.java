package com.ezone.backend.dto.basket;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record CreateBasketJobRequest(
    @NotBlank String companyName,
    @NotBlank String positionTitle,
    @Pattern(regexp = "^$|^미정$|^오늘$|^D-\\d+$|^\\d{4}\\.\\d{2}\\.\\d{2}$") String deadlineLabel,
    @NotBlank @Pattern(regexp = "^https?://\\S+$") String sourceUrl,
    String savedSource
) {
}
