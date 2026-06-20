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

    @Update("""
        UPDATE mm_messages
        SET posted_at = CASE WHEN #{postedAt} IS NULL THEN posted_at ELSE STR_TO_DATE(#{postedAt}, '%Y-%m-%dT%H:%i:%s') END,
            updated_at = CURRENT_TIMESTAMP
        WHERE message_id = #{messageId}
          AND posted_at IS NULL
          AND #{postedAt} IS NOT NULL
        """)
    void updateMessagePostedAtIfMissing(@Param("messageId") String messageId, @Param("postedAt") String postedAt);

    @Insert("""
        INSERT INTO mm_messages (
          channel_id, message_id, sender_name, raw_text, raw_payload_json,
          message_type, parse_status, parse_error, posted_at, received_at, created_at, updated_at
        )
        VALUES (
          #{channelId}, #{messageId}, #{senderName}, #{rawText}, #{rawPayloadJson},
          #{messageType}, #{parseStatus}, #{parseError},
          CASE WHEN #{postedAt} IS NULL THEN NULL ELSE STR_TO_DATE(#{postedAt}, '%Y-%m-%dT%H:%i:%s') END,
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        """)
    @Options(useGeneratedKeys = true, keyProperty = "id")
    void insertMessage(MattermostMessageRow row);

    @Insert("""
        INSERT INTO mm_parsed_job_posts (
          mm_message_id, company_name, title, url, deadline_label, deadline_type, deadline_date,
          normalized_deadline_label, review_status, created_at, updated_at
        )
        VALUES (
          #{messageId}, #{companyName}, #{title}, #{url}, #{deadlineLabel}, #{deadlineType}, #{deadlineDate},
          #{normalizedDeadlineLabel}, #{reviewStatus},
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        ON DUPLICATE KEY UPDATE
          company_name = VALUES(company_name),
          title = VALUES(title),
          deadline_label = VALUES(deadline_label),
          deadline_type = VALUES(deadline_type),
          deadline_date = VALUES(deadline_date),
          normalized_deadline_label = VALUES(normalized_deadline_label),
          updated_at = CURRENT_TIMESTAMP
        """)
    @Options(useGeneratedKeys = true, keyProperty = "id")
    void insertParsedJobPost(MattermostParsedJobPostRow row);

    @Select("""
        SELECT id, mm_message_id AS messageId, company_name AS companyName, title, url,
               deadline_label AS deadlineLabel, deadline_type AS deadlineType,
               DATE_FORMAT(deadline_date, '%Y-%m-%d') AS deadlineDate,
               normalized_deadline_label AS normalizedDeadlineLabel,
               review_status AS reviewStatus,
               reviewer_user_id AS reviewerUserId, promoted_job_id AS promotedJobId,
               NULL AS postedAt, NULL AS receivedAt,
               NULL AS recommendationScore, NULL AS recommendationReason, NULL AS recommendationStatus
        FROM mm_parsed_job_posts
        WHERE id = #{id}
        LIMIT 1
        """)
    Optional<MattermostParsedJobPostRow> findParsedJobPost(@Param("id") Long id);

    @Select("""
        SELECT id, mm_message_id AS messageId, company_name AS companyName, title, url,
               deadline_label AS deadlineLabel, deadline_type AS deadlineType,
               DATE_FORMAT(deadline_date, '%Y-%m-%d') AS deadlineDate,
               normalized_deadline_label AS normalizedDeadlineLabel,
               review_status AS reviewStatus,
               reviewer_user_id AS reviewerUserId, promoted_job_id AS promotedJobId,
               NULL AS postedAt, NULL AS receivedAt,
               NULL AS recommendationScore, NULL AS recommendationReason, NULL AS recommendationStatus
        FROM mm_parsed_job_posts
        WHERE review_status = #{reviewStatus}
        ORDER BY id DESC
        """)
    List<MattermostParsedJobPostRow> listParsedJobPosts(@Param("reviewStatus") String reviewStatus);

    @Select("""
        SELECT p.id, p.mm_message_id AS messageId, p.company_name AS companyName, p.title, p.url,
               p.deadline_label AS deadlineLabel, p.deadline_type AS deadlineType,
               DATE_FORMAT(p.deadline_date, '%Y-%m-%d') AS deadlineDate,
               p.normalized_deadline_label AS normalizedDeadlineLabel,
               p.review_status AS reviewStatus,
               p.reviewer_user_id AS reviewerUserId, p.promoted_job_id AS promotedJobId,
               DATE_FORMAT(m.posted_at, '%Y-%m-%dT%H:%i:%s') AS postedAt,
               DATE_FORMAT(m.received_at, '%Y-%m-%dT%H:%i:%s') AS receivedAt,
               s.score AS recommendationScore,
               s.reason AS recommendationReason,
               s.status AS recommendationStatus
        FROM mm_parsed_job_posts p
        JOIN mm_messages m ON m.id = p.mm_message_id
        LEFT JOIN mm_recommendation_scores s
          ON s.candidate_id = p.id
         AND s.user_id = #{userId}
        WHERE p.review_status IN ('NEEDS_REVIEW', 'APPROVED')
        ORDER BY p.id DESC
        """)
    List<MattermostParsedJobPostRow> listRecommendationCandidates(@Param("userId") Long userId);

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
