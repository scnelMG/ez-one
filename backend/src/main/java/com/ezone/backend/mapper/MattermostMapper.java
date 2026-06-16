package com.ezone.backend.mapper;

import com.ezone.backend.domain.persistence.MattermostMessageRow;
import com.ezone.backend.domain.persistence.MattermostParsedJobPostRow;
import java.util.List;
import java.util.Optional;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Options;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

@Mapper
public interface MattermostMapper {

    @Select("SELECT id FROM mm_messages WHERE message_id = #{messageId} LIMIT 1")
    Optional<Long> findMessageId(@Param("messageId") String messageId);

    @Insert("""
        INSERT INTO mm_messages (
          channel_id, message_id, sender_name, raw_text, raw_payload_json,
          message_type, parse_status, parse_error, received_at, created_at, updated_at
        )
        VALUES (
          #{channelId}, #{messageId}, #{senderName}, #{rawText}, #{rawPayloadJson},
          #{messageType}, #{parseStatus}, #{parseError}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        """)
    @Options(useGeneratedKeys = true, keyProperty = "id")
    void insertMessage(MattermostMessageRow row);

    @Insert("""
        INSERT INTO mm_parsed_job_posts (
          mm_message_id, company_name, title, url, deadline_label, review_status, created_at, updated_at
        )
        VALUES (
          #{messageId}, #{companyName}, #{title}, #{url}, #{deadlineLabel}, #{reviewStatus},
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        ON DUPLICATE KEY UPDATE
          company_name = VALUES(company_name),
          title = VALUES(title),
          deadline_label = VALUES(deadline_label),
          updated_at = CURRENT_TIMESTAMP
        """)
    @Options(useGeneratedKeys = true, keyProperty = "id")
    void insertParsedJobPost(MattermostParsedJobPostRow row);

    @Select("""
        SELECT id, mm_message_id AS messageId, company_name AS companyName, title, url,
               deadline_label AS deadlineLabel, review_status AS reviewStatus,
               reviewer_user_id AS reviewerUserId, promoted_job_id AS promotedJobId
        FROM mm_parsed_job_posts
        WHERE id = #{id}
        LIMIT 1
        """)
    Optional<MattermostParsedJobPostRow> findParsedJobPost(@Param("id") Long id);

    @Select("""
        SELECT id, mm_message_id AS messageId, company_name AS companyName, title, url,
               deadline_label AS deadlineLabel, review_status AS reviewStatus,
               reviewer_user_id AS reviewerUserId, promoted_job_id AS promotedJobId
        FROM mm_parsed_job_posts
        WHERE review_status = #{reviewStatus}
        ORDER BY id DESC
        """)
    List<MattermostParsedJobPostRow> listParsedJobPosts(@Param("reviewStatus") String reviewStatus);

    @Update("""
        UPDATE mm_parsed_job_posts
        SET review_status = #{reviewStatus},
            reviewer_user_id = #{reviewerUserId},
            promoted_job_id = #{promotedJobId},
            reviewed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = #{id}
        """)
    void markParsedJobPostReviewed(
        @Param("id") Long id,
        @Param("reviewStatus") String reviewStatus,
        @Param("reviewerUserId") Long reviewerUserId,
        @Param("promotedJobId") Long promotedJobId
    );
}
