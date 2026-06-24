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
    void ranksActivitiesWithReadableFallbackAndCountsDraftLengthDeterministically() {
        ProfileService profileService = new StubProfileService(new DocumentProfileResponse(
            Map.of(
                "projects",
                Map.of("projects", List.of(
                    Map.of(
                        "projectName", "EZ-ONE 지원 자동화",
                        "role", "백엔드 확장 프로그램 담당",
                        "summary", "Chrome Extension과 Spring Boot API를 연결해 지원서 자동 입력 흐름을 구현",
                        "outcome", "반복 입력 시간을 줄임",
                        "techStack", "Vue, Spring Boot, Chrome Extension"
                    )
                )),
                "activities",
                Map.of("activities", List.of(
                    Map.of(
                        "activityName", "데이터 연구회",
                        "role", "팀원",
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

        assertThat(response.warnings()).containsExactly("AI 연결이 불안정해 저장된 활동 기준으로 임시 추천했습니다.");
        assertThat(response.recommendations()).hasSize(1);
        assertThat(response.recommendations().get(0).recruiterView()).contains("직무 관련성");
        assertThat(response.recommendations().get(0).practitionerView()).contains("기여 범위");
        assertThat(response.recommendations().get(0).drafts().get(0).label()).isEqualTo("제한 맞춤");
        assertThat(response.recommendations().get(0).drafts().get(0).charCount()).isLessThanOrEqualTo(80);
    }

    @Test
    void expandsShortAiDraftsTowardTheRequestedCharacterLimitUsingSavedActivityFacts() {
        ProfileService profileService = new StubProfileService(new DocumentProfileResponse(
            Map.of(
                "activities",
                Map.of("activities", List.of(
                    Map.of(
                        "activityName", "DIVE 글로벌 해커톤 - BNK부산은행 고객관리 방안 제안",
                        "role", "금융 데이터 분석과 고객관리 전략 기획",
                        "summary", "BNK부산은행 고객 거래 데이터를 전처리하고 K-means 군집화를 통해 고객 세분화를 수행했습니다. 각 군집의 상품 보유 현황과 디지털 채널 이용 패턴을 비교하여 맞춤형 고객관리 전략을 제안했습니다.",
                        "outcome", "데이터 전처리부터 분석, 전략 기획까지 주도적으로 수행했습니다.",
                        "techStack", "Python, K-means, 고객 세분화, 금융 데이터 분석"
                    )
                ))
            ),
            "2026-06-23T13:00:00"
        ));
        ApplicationActivityAssistAiClient shortAi = (request, candidates, maxItems, detailLimit, unit) ->
            Optional.of(List.of(new com.ezone.backend.dto.extension.ApplicationActivityRecommendation(
                1,
                "DIVE 글로벌 해커톤 - BNK부산은행 고객관리 방안 제안",
                90,
                "금융권 데이터 분석 경험이 있습니다.",
                "클러스터링 경험이 있습니다.",
                List.of("금융 데이터 분석"),
                List.of(),
                List.of(new com.ezone.backend.dto.extension.ApplicationActivityRecommendationDraft(
                    "글자수 맞춤",
                    "BNK부산은행 고객 거래 데이터를 분석하여 고객 세분화와 관리 전략을 제안했습니다.",
                    43,
                    111,
                    false
                ))
            )));
        ApplicationActivityAssistService service = new ApplicationActivityAssistService(profileService, shortAi);

        var response = service.recommend(1L, new ApplicationActivityAssistRequest(
            "BNK부산은행",
            "데이터 분석",
            1,
            500,
            "char",
            "학내외활동 500자",
            List.of("학내외활동")
        ));

        var draft = response.recommendations().get(0).drafts().get(0);
        assertThat(draft.exceedsLimit()).isFalse();
        assertThat(draft.charCount()).isBetween(450, 500);
        assertThat(draft.text()).contains("K-means");
        assertThat(draft.text()).contains("고객 세분화");
        assertThat(draft.text()).contains("Python");
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
