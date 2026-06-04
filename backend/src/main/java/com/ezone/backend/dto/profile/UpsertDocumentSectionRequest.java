package com.ezone.backend.dto.profile;

import java.util.Map;

public record UpsertDocumentSectionRequest(
    Map<String, Object> payload
) {
}
