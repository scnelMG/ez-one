package com.ezone.backend.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.ezone.backend.dto.extension.ApplicationActivityAssistRequest;
import com.ezone.backend.dto.profile.DocumentProfileResponse;
import com.ezone.backend.dto.profile.UpsertDocumentSectionRequest;
import com.ezone.backend.dto.profile.UserProfileRequest;
import com.ezone.backend.dto.profile.UserProfileResponse;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class ApplicationActivityAssistServiceTest {

    @Test
    void ranksActivitiesWithFallbackAndCountsDraftLengthDeterministically() {
        ProfileService profileService = new StubProfileService(new DocumentProfileResponse(
            Map.of(
                "projects",
                Map.of("projects", List.of(
                    Map.of(
                        "projectName", "EZ-ONE 지원 자동화",
                        "role", "백엔드/확장 프로그램 담당",
                        "summary", "Chrome Extension과 Spring Boot API를 연결해 지원서 자동 입력 흐름을 구현",
                        "outcome", "반복 입력 시간을 줄임",
                        "techStack", "Vue, Spring Boot, Chrome Extension"
                    )
                )),
                "activities",
                Map.of("activities", List.of(
                    Map.of(
                        "activityName", "핀테크 연구회",
                        "role", "팀장",
                        "summary", "금융 데이터 분석 스터디를 운영",
                        "outcome", "발표 자료 제작"
                    )
                ))
            ),
            "2026-06-23T13:00:00"
        ));
        ApplicationActivityAssistAiClient unavailableAi = (request, candidates, maxItems, detailLimit, unit) ->
            Optional.empty();
        ApplicationActivityAssistService service = new ApplicationActivityAssistService(profileService, unavailableAi);

        var response = service.recommend(1L, new ApplicationActivityAssistRequest(
            "카카오",
            "백엔드 개발자",
            1,
            80,
            "char",
            "프로젝트 상세",
            List.of("상세 내용")
        ));

        assertThat(response.warnings()).isNotEmpty();
        assertThat(response.recommendations()).hasSize(1);
        assertThat(response.recommendations().get(0).drafts().get(0).charCount()).isLessThanOrEqualTo(80);
    }

    private record StubProfileService(DocumentProfileResponse documentProfile) implements ProfileService {

        @Override
        public UserProfileResponse getUserProfile(Long userId) {
            throw new UnsupportedOperationException();
        }

        @Override
        public UserProfileResponse updateUserProfile(Long userId, UserProfileRequest request) {
            throw new UnsupportedOperationException();
        }

        @Override
        public DocumentProfileResponse getDocumentProfile(Long userId) {
            return documentProfile;
        }

        @Override
        public DocumentProfileResponse upsertSection(Long userId, String sectionType, UpsertDocumentSectionRequest request) {
            throw new UnsupportedOperationException();
        }
    }
}
