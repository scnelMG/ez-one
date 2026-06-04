package com.ezone.backend.dto.basket;

import jakarta.validation.constraints.NotBlank;

public record CreateBasketJobRequest(
    @NotBlank String companyName,
    @NotBlank String positionTitle,
    String deadlineLabel,
    @NotBlank String sourceUrl,
    String savedSource
) {
}
