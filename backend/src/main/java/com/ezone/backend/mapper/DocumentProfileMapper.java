package com.ezone.backend.mapper;

import com.ezone.backend.domain.persistence.DocumentProfileSectionRow;
import java.util.List;
import java.util.Optional;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface DocumentProfileMapper {

    @Select("""
        SELECT user_id AS userId,
               section_type AS sectionType,
               payload_json AS payloadJson,
               updated_at AS updatedAt
        FROM document_profile_sections
        WHERE user_id = #{userId}
        ORDER BY section_type ASC
    """)
    List<DocumentProfileSectionRow> listSections(@Param("userId") Long userId);

    @Select("""
        SELECT MAX(saved_at)
        FROM (
            SELECT DATE_FORMAT(updated_at, '%Y-%m-%dT%H:%i:%s') AS saved_at FROM document_profile_sections WHERE user_id = #{userId}
        ) document_profile_saved_at
    """)
    Optional<String> findLastSavedAt(@Param("userId") Long userId);

    @Insert("""
        INSERT INTO document_profile_sections (user_id, section_type, payload_json)
        VALUES (#{userId}, #{sectionType}, #{payloadJson})
        ON DUPLICATE KEY UPDATE
            payload_json = VALUES(payload_json),
            updated_at = CURRENT_TIMESTAMP
    """)
    void upsertSection(
        @Param("userId") Long userId,
        @Param("sectionType") String sectionType,
        @Param("payloadJson") String payloadJson
    );
}
