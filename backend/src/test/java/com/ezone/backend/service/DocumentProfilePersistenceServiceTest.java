package com.ezone.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

import com.ezone.backend.domain.persistence.DocumentProfileSectionRow;
import com.ezone.backend.dto.profile.DocumentProfileResponse;
import com.ezone.backend.dto.profile.UpsertDocumentSectionRequest;
import com.ezone.backend.mapper.DocumentProfileMapper;
import com.ezone.backend.mapper.UserAccountMapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class DocumentProfilePersistenceServiceTest {

    private final UserAccountMapper userAccountMapper = mock(UserAccountMapper.class);
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final FakeDocumentProfileMapper mapper = new FakeDocumentProfileMapper();

    @Test
    void savedDocumentProfileSectionsSurviveNewServiceInstance() {
        InMemoryProfileService firstService = new InMemoryProfileService(userAccountMapper, objectMapper, mapper);
        InMemoryProfileService secondService = new InMemoryProfileService(userAccountMapper, objectMapper, mapper);

        firstService.upsertSection(7L, "basicInfo", new UpsertDocumentSectionRequest(Map.of(
            "nameKo", "Kim Codex",
            "email", "codex@example.com"
        )));

        DocumentProfileResponse response = secondService.getDocumentProfile(7L);

        assertThat(response.sections()).containsKey("basicInfo");
        assertThat(response.sections().get("basicInfo"))
            .isEqualTo(Map.of("nameKo", "Kim Codex", "email", "codex@example.com"));
        assertThat(response.lastSavedAt()).isNotNull();
    }

    @Test
    void savedMilitarySectionKeepsStructuredFields() {
        InMemoryProfileService service = new InMemoryProfileService(userAccountMapper, objectMapper, mapper);
        Map<String, Object> militaryRecord = new LinkedHashMap<>();
        militaryRecord.put("status", "군필");
        militaryRecord.put("branch", "육군");
        militaryRecord.put("rank", "병장");
        militaryRecord.put("dischargeType", "만기제대");
        militaryRecord.put("hasDisability", false);
        militaryRecord.put("isVeteran", false);

        service.upsertSection(7L, "military", new UpsertDocumentSectionRequest(Map.of(
            "military", List.of(militaryRecord)
        )));

        DocumentProfileResponse response = service.getDocumentProfile(7L);

        assertThat(response.sections().get("military"))
            .isEqualTo(Map.of("military", List.of(militaryRecord)));
        assertThat(response.lastSavedAt()).isNotNull();
    }

    @Test
    void documentProfileSaveFailsWhenDatabaseMapperIsMissing() {
        InMemoryProfileService service = new InMemoryProfileService(
            userAccountMapper,
            objectMapper,
            (DocumentProfileMapper) null
        );

        assertThatThrownBy(() -> service.upsertSection(7L, "basicInfo", new UpsertDocumentSectionRequest(Map.of(
            "nameKo", "Kim Codex",
            "email", "codex@example.com"
        ))))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("Document profile persistence is not configured");
    }

    private static final class FakeDocumentProfileMapper implements DocumentProfileMapper {
        private final Map<String, DocumentProfileSectionRow> sections = new LinkedHashMap<>();

        @Override
        public List<DocumentProfileSectionRow> listSections(Long userId) {
            return sections.values().stream()
                .filter(row -> row.userId().equals(userId))
                .toList();
        }

        @Override
        public Optional<String> findLastSavedAt(Long userId) {
            return sections.values().stream()
                .filter(row -> row.userId().equals(userId))
                .map(DocumentProfileSectionRow::updatedAt)
                .findFirst();
        }

        @Override
        public void upsertSection(Long userId, String sectionType, String payloadJson) {
            sections.put(key(userId, sectionType), new DocumentProfileSectionRow(
                userId,
                sectionType,
                payloadJson,
                Instant.now().toString()
            ));
        }

        private String key(Long userId, String sectionType) {
            return userId + ":" + sectionType;
        }
    }
}
