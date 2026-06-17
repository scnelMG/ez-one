package com.ezone.backend.dto.support;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateSupportRequest(
    @NotBlank
    @Pattern(regexp = "INQUIRY|PARTNERSHIP")
    String requestType,

    @NotBlank
    @Size(max = 64)
    String category,

    @NotBlank
    @Size(max = 255)
    String title,

    @NotBlank
    @Size(max = 5000)
    String body,

    @Size(max = 255)
    String companyName,

    @Size(max = 255)
    String contactName,

    @Email
    @Size(max = 255)
    String contactEmail,

    @Size(max = 64)
    String contactPhone
) {
}
