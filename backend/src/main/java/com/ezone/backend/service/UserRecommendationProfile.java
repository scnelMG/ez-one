package com.ezone.backend.service;

import com.ezone.backend.domain.persistence.UserProfileRow;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;

public record UserRecommendationProfile(
    List<String> desiredRoles,
    List<String> companyTypes,
    List<String> industries,
    List<String> regions,
    List<String> skills,
    boolean ssafy
) {
    private static final TypeReference<List<String>> STRING_LIST_TYPE = new TypeReference<>() {
    };

    public UserRecommendationProfile {
        desiredRoles = safeList(desiredRoles);
        companyTypes = safeList(companyTypes);
        industries = safeList(industries);
        regions = safeList(regions);
        skills = safeList(skills);
    }

    public static UserRecommendationProfile empty() {
        return new UserRecommendationProfile(List.of(), List.of(), List.of(), List.of(), List.of(), false);
    }

    public static UserRecommendationProfile from(UserProfileRow row, ObjectMapper objectMapper) {
        if (row == null) {
            return empty();
        }
        return new UserRecommendationProfile(
            readList(row.desiredRolesJson(), objectMapper),
            readList(row.companyTypesJson(), objectMapper),
            readList(row.industriesJson(), objectMapper),
            readList(row.regionsJson(), objectMapper),
            readList(row.skillsJson(), objectMapper),
            row.ssafy()
        );
    }

    public String fingerprint() {
        String canonical = String.join("|",
            String.join(",", desiredRoles),
            String.join(",", companyTypes),
            String.join(",", industries),
            String.join(",", regions),
            String.join(",", skills),
            Boolean.toString(ssafy)
        );
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(canonical.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest).substring(0, 12);
        }
        catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 digest is not available.", exception);
        }
    }

    public String promptSummary() {
        return """
            사용자 온보딩 프로필:
            - 희망 직무: %s
            - 희망 기업 유형: %s
            - 관심 업종: %s
            - 희망 지역: %s
            - 보유 기술: %s
            - SSAFY 교육생 여부: %s
            """.formatted(
            displayList(desiredRoles),
            displayList(companyTypes),
            displayList(industries),
            displayList(regions),
            displayList(skills),
            ssafy ? "예" : "아니오"
        );
    }

    private static List<String> safeList(List<String> values) {
        return values == null ? List.of() : values.stream()
            .filter(value -> value != null && !value.isBlank())
            .map(String::trim)
            .distinct()
            .toList();
    }

    private static List<String> readList(String valueJson, ObjectMapper objectMapper) {
        if (valueJson == null || valueJson.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(valueJson, STRING_LIST_TYPE);
        }
        catch (JsonProcessingException exception) {
            return List.of();
        }
    }

    private static String displayList(List<String> values) {
        return values.isEmpty() ? "미입력" : String.join(", ", values);
    }
}
