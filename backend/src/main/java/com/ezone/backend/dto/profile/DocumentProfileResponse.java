package com.ezone.backend.dto.profile;

import java.util.Map;

public record DocumentProfileResponse(
    Map<String, Object> sections,
    String lastSavedAt
) {
}
