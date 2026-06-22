package com.ezone.backend.service;

import com.ezone.backend.domain.persistence.UserProfileRow;
import com.ezone.backend.dto.profile.DocumentProfileResponse;
import com.ezone.backend.dto.profile.UpsertDocumentSectionRequest;
import com.ezone.backend.dto.profile.UserProfileRequest;
import com.ezone.backend.dto.profile.UserProfileResponse;
import com.ezone.backend.mapper.DocumentProfileMapper;
import com.ezone.backend.mapper.UserAccountMapper;
import com.ezone.backend.mapper.UserProfileMapper;
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

    private static final TypeReference<List<String>> STRING_LIST_TYPE = new TypeReference<>() {
    };

    private final UserAccountMapper userAccountMapper;
    private final ObjectMapper objectMapper;
    private final DocumentProfileMapper documentProfileMapper;
    private final UserProfileMapper userProfileMapper;

    @Autowired
    public InMemoryProfileService(
        UserAccountMapper userAccountMapper,
        ObjectMapper objectMapper,
        ObjectProvider<DocumentProfileMapper> documentProfileMapper,
        ObjectProvider<UserProfileMapper> userProfileMapper
    ) {
        this(userAccountMapper, objectMapper, documentProfileMapper.getIfAvailable(), userProfileMapper.getIfAvailable());
    }

    public InMemoryProfileService(UserAccountMapper userAccountMapper) {
        this(userAccountMapper, new ObjectMapper(), (DocumentProfileMapper) null, (UserProfileMapper) null);
    }

    public InMemoryProfileService(UserAccountMapper userAccountMapper, UserProfileMapper userProfileMapper) {
        this(userAccountMapper, new ObjectMapper(), (DocumentProfileMapper) null, userProfileMapper);
    }

    InMemoryProfileService(
        UserAccountMapper userAccountMapper,
        ObjectMapper objectMapper,
        DocumentProfileMapper documentProfileMapper
    ) {
        this(userAccountMapper, objectMapper, documentProfileMapper, (UserProfileMapper) null);
    }

    InMemoryProfileService(
        UserAccountMapper userAccountMapper,
        ObjectMapper objectMapper,
        DocumentProfileMapper documentProfileMapper,
        UserProfileMapper userProfileMapper
    ) {
        this.userAccountMapper = userAccountMapper;
        this.objectMapper = objectMapper;
        this.documentProfileMapper = documentProfileMapper;
        this.userProfileMapper = userProfileMapper;
    }

    @Override
    public UserProfileResponse getUserProfile(Long userId) {
        return requireUserProfileMapper().findByUserId(userId)
            .map(this::toResponse)
            .orElseGet(() -> emptyProfile(false));
    }

    @Override
    @Transactional
    public UserProfileResponse updateUserProfile(Long userId, UserProfileRequest request) {
        UserProfileMapper mapper = requireUserProfileMapper();
        mapper.upsert(
            userId,
            writeList(safeList(request.desiredRoles())),
            writeList(safeList(request.companyTypes())),
            writeList(safeList(request.industries())),
            writeList(safeList(request.regions())),
            writeList(safeList(request.skills())),
            request.ssafy()
        );
        userAccountMapper.markProfileCompleted(userId);

        return mapper.findByUserId(userId)
            .map(this::toResponse)
            .orElseThrow(() -> new IllegalStateException("Saved user profile could not be loaded."));
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

    private UserProfileResponse emptyProfile(boolean completed) {
        return new UserProfileResponse(
            List.of(),
            List.of(),
            List.of(),
            List.of(),
            List.of(),
            false,
            completed
        );
    }

    private UserProfileResponse toResponse(UserProfileRow row) {
        return new UserProfileResponse(
            readList(row.desiredRolesJson()),
            readList(row.companyTypesJson()),
            readList(row.industriesJson()),
            readList(row.regionsJson()),
            readList(row.skillsJson()),
            row.ssafy(),
            row.completed()
        );
    }

    private List<String> safeList(List<String> values) {
        return values == null ? List.of() : values;
    }

    private List<String> readList(String valueJson) {
        if (valueJson == null || valueJson.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(valueJson, STRING_LIST_TYPE);
        }
        catch (JsonProcessingException exception) {
            throw new IllegalStateException("User profile list payload is not valid JSON.", exception);
        }
    }

    private String writeList(List<String> values) {
        try {
            return objectMapper.writeValueAsString(values == null ? List.of() : values);
        }
        catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("User profile list payload cannot be serialized.", exception);
        }
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

    private UserProfileMapper requireUserProfileMapper() {
        if (userProfileMapper == null) {
            throw new IllegalStateException("User profile persistence is not configured.");
        }
        return userProfileMapper;
    }
}
