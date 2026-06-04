package com.ezone.backend.dto.profile;

import java.util.List;

public record UserProfileResponse(
    List<String> desiredRoles,
    List<String> companyTypes,
    List<String> industries,
    List<String> regions,
    List<String> skills,
    boolean ssafy,
    boolean completed
) {
}
