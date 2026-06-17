package com.ezone.backend.service;

import com.ezone.backend.dto.profile.DocumentProfileResponse;
import com.ezone.backend.dto.profile.UpsertDocumentSectionRequest;
import com.ezone.backend.dto.profile.UserProfileRequest;
import com.ezone.backend.dto.profile.UserProfileResponse;
import com.ezone.backend.mapper.DocumentProfileMapper;
import com.ezone.backend.mapper.UserAccountMapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InMemoryProfileService implements ProfileService {

    private static final TypeReference<Map<String, Object>> SECTION_PAYLOAD_TYPE = new TypeReference<>() {
    };

    private final UserAccountMapper userAccountMapper;
    private final ObjectMapper objectMapper;
    private final DocumentProfileMapper documentProfileMapper;
    private final Map<Long, UserProfileResponse> userProfiles = new LinkedHashMap<>();

    @Autowired
    public InMemoryProfileService(
        UserAccountMapper userAccountMapper,
        ObjectMapper objectMapper,
        ObjectProvider<DocumentProfileMapper> documentProfileMapper
    ) {
        this(userAccountMapper, objectMapper, documentProfileMapper.getIfAvailable());
    }

    public InMemoryProfileService(UserAccountMapper userAccountMapper) {
        this(userAccountMapper, new ObjectMapper(), (DocumentProfileMapper) null);
    }

    InMemoryProfileService(
        UserAccountMapper userAccountMapper,
        ObjectMapper objectMapper,
        DocumentProfileMapper documentProfileMapper
    ) {
        this.userAccountMapper = userAccountMapper;
        this.objectMapper = objectMapper;
        this.documentProfileMapper = documentProfileMapper;
        seedDemoProfile();
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
        userAccountMapper.markProfileCompleted(userId);
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
        DocumentProfileMapper mapper = requireDocumentProfileMapper();
        Map<String, Object> sections = new LinkedHashMap<>();
        mapper.listSections(userId).forEach(row ->
            sections.put(row.sectionType(), readPayload(row.payloadJson()))
        );
        return new DocumentProfileResponse(
            sections,
            mapper.findLastSavedAt(userId).orElse(null)
        );
    }

    @Override
    @Transactional
    public DocumentProfileResponse upsertSection(Long userId, String sectionType, UpsertDocumentSectionRequest request) {
        requireDocumentProfileMapper().upsertSection(userId, sectionType, writePayload(request.payload()));
        return getDocumentProfile(userId);
    }

    private void seedDemoProfile() {
        userProfiles.put(1L, new UserProfileResponse(
            List.of("백엔드 개발자"),
            List.of("대기업", "스타트업"),
            List.of("핀테크", "생산성 도구"),
            List.of("서울", "경기"),
            List.of("Java", "Spring Boot", "MyBatis"),
            true,
            true
        ));
    }

    private List<String> safeList(List<String> values) {
        return values == null ? List.of() : values;
    }

    private Map<String, Object> readPayload(String payloadJson) {
        try {
            return objectMapper.readValue(payloadJson, SECTION_PAYLOAD_TYPE);
        }
        catch (JsonProcessingException exception) {
            throw new IllegalStateException("Document profile section payload is not valid JSON.", exception);
        }
    }

    private String writePayload(Map<String, Object> payload) {
        try {
            return objectMapper.writeValueAsString(payload == null ? Map.of() : payload);
        }
        catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Document profile section payload cannot be serialized.", exception);
        }
    }

    private DocumentProfileMapper requireDocumentProfileMapper() {
        if (documentProfileMapper == null) {
            throw new IllegalStateException("Document profile persistence is not configured.");
        }
        return documentProfileMapper;
    }
}
