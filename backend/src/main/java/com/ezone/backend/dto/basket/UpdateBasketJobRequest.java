package com.ezone.backend.dto.basket;

import jakarta.validation.constraints.NotBlank;

public record UpdateBasketJobRequest(
    @NotBlank String companyName,
    @NotBlank String positionTitle,
    String deadlineLabel,
    @NotBlank String sourceUrl
) {
}
