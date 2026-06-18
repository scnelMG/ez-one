package com.ezone.backend.dto.dart;

import java.util.List;

public record DartDisclosureListResponse(
    boolean available,
    String message,
    List<DartDisclosureResponse> disclosures
) {
    public static DartDisclosureListResponse available(List<DartDisclosureResponse> disclosures) {
        return new DartDisclosureListResponse(true, null, disclosures);
    }

    public static DartDisclosureListResponse unavailable(String message) {
        return new DartDisclosureListResponse(false, message, List.of());
    }
}
