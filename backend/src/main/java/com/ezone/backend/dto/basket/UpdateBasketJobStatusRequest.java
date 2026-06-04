package com.ezone.backend.dto.basket;

import com.ezone.backend.domain.ApplicationStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateBasketJobStatusRequest(
    @NotNull ApplicationStatus applicationStatus
) {
}
