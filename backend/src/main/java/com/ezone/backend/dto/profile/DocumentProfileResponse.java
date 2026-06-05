package com.ezone.backend.dto.profile;

import java.util.List;
import java.util.Map;

public record DocumentProfileResponse(
    Map<String, Object> sections,
    List<DocumentCustomFieldResponse> customFields,
    String lastSavedAt
) {
}
