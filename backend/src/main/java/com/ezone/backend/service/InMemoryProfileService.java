package com.ezone.backend.service;

import com.ezone.backend.dto.profile.CreateDocumentCustomFieldRequest;
import com.ezone.backend.dto.profile.DocumentCustomFieldResponse;
import com.ezone.backend.dto.profile.DocumentProfileResponse;
import com.ezone.backend.dto.profile.UpsertDocumentSectionRequest;
import com.ezone.backend.dto.profile.UserProfileRequest;
import com.ezone.backend.dto.profile.UserProfileResponse;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.stereotype.Service;

@Service
public class InMemoryProfileService implements ProfileService {

    private final AtomicLong idGenerator = new AtomicLong(300);
    private final Map<Long, UserProfileResponse> userProfiles = new LinkedHashMap<>();
    private final Map<Long, Map<String, Object>> documentSections = new LinkedHashMap<>();
    private final Map<Long, List<DocumentCustomFieldResponse>> customFields = new LinkedHashMap<>();

    public InMemoryProfileService() {
        userProfiles.put(1L, new UserProfileResponse(
            List.of("백엔드 개발자"),
            List.of("대기업", "스타트업"),
            List.of("핀테크", "생산성 도구"),
            List.of("서울", "경기"),
            List.of("Java", "Spring Boot", "MyBatis"),
            true,
            true
        ));
        documentSections.put(1L, new LinkedHashMap<>(Map.of(
            "basicInfo", Map.of("nameKo", "", "email", ""),
            "projects", List.of(),
            "awards", List.of()
        )));
        customFields.put(1L, new ArrayList<>());
    }

    @Override
    public UserProfileResponse getUserProfile(Long userId) {
        return userProfiles.computeIfAbsent(userId, ignored -> new UserProfileResponse(
            List.of(),
            List.of(),
            List.of(),
            List.of(),
            List.of(),
            false,
            false
        ));
    }

    @Override
    public UserProfileResponse updateUserProfile(Long userId, UserProfileRequest request) {
        UserProfileResponse response = new UserProfileResponse(
            safeList(request.desiredRoles()),
            safeList(request.companyTypes()),
            safeList(request.industries()),
            safeList(request.regions()),
            safeList(request.skills()),
            request.ssafy(),
            true
        );
        userProfiles.put(userId, response);
        return response;
    }

    @Override
    public DocumentProfileResponse getDocumentProfile(Long userId) {
        return new DocumentProfileResponse(
            documentSections.computeIfAbsent(userId, ignored -> new LinkedHashMap<>()),
            customFields.computeIfAbsent(userId, ignored -> new ArrayList<>())
        );
    }

    @Override
    public DocumentProfileResponse upsertSection(Long userId, String sectionType, UpsertDocumentSectionRequest request) {
        Map<String, Object> sections = documentSections.computeIfAbsent(userId, ignored -> new LinkedHashMap<>());
        sections.put(sectionType, request.payload() == null ? Map.of() : request.payload());
        return getDocumentProfile(userId);
    }

    @Override
    public DocumentCustomFieldResponse createCustomField(Long userId, CreateDocumentCustomFieldRequest request) {
        DocumentCustomFieldResponse response = new DocumentCustomFieldResponse(
            idGenerator.incrementAndGet(),
            request.label(),
            request.fieldType(),
            request.value()
        );
        customFields.computeIfAbsent(userId, ignored -> new ArrayList<>()).add(response);
        return response;
    }

    @Override
    public DocumentCustomFieldResponse updateCustomField(Long userId, Long fieldId, CreateDocumentCustomFieldRequest request) {
        List<DocumentCustomFieldResponse> fields = customFields.computeIfAbsent(userId, ignored -> new ArrayList<>());
        fields.removeIf(field -> field.id().equals(fieldId));
        DocumentCustomFieldResponse response = new DocumentCustomFieldResponse(
            fieldId,
            request.label(),
            request.fieldType(),
            request.value()
        );
        fields.add(response);
        return response;
    }

    @Override
    public void deleteCustomField(Long userId, Long fieldId) {
        customFields.computeIfAbsent(userId, ignored -> new ArrayList<>())
            .removeIf(field -> field.id().equals(fieldId));
    }

    private List<String> safeList(List<String> values) {
        return values == null ? List.of() : values;
    }
}
