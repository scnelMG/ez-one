package com.ezone.backend.domain.persistence;

public record UserProfileRow(
    Long userId,
    String desiredRolesJson,
    String companyTypesJson,
    String industriesJson,
    String regionsJson,
    String skillsJson,
    boolean ssafy,
    boolean completed
) {
}
