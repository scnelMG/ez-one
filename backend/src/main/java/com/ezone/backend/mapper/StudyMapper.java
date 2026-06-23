package com.ezone.backend.mapper;

import com.ezone.backend.domain.persistence.*;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface StudyMapper {
    void insertStudyGroup(StudyGroupRow row);
    StudyGroupRow findStudyGroupById(@Param("id") String id);
    List<StudyGroupRow> findStudyGroupsByUserEmail(@Param("userEmail") String userEmail);

    void insertStudyMember(StudyMemberRow row);
    List<StudyMemberRow> findMembersByStudyId(@Param("studyId") String studyId);

    @org.apache.ibatis.annotations.Select("SELECT COUNT(*) FROM basket_jobs bj JOIN users u ON bj.user_id = u.id WHERE u.email = #{userEmail} AND bj.application_status = 'PROGRESS' AND bj.deleted_at IS NULL")
    int countActiveJobsByUserEmail(@Param("userEmail") String userEmail);

    @org.apache.ibatis.annotations.Select("SELECT COUNT(*) FROM basket_jobs bj JOIN users u ON bj.user_id = u.id WHERE u.email = #{userEmail} AND bj.application_status IN ('READY', 'NOT_APPLIED') AND bj.deleted_at IS NULL")
    int countNotStartedJobsByUserEmail(@Param("userEmail") String userEmail);

    @org.apache.ibatis.annotations.Select("SELECT COUNT(*) FROM basket_jobs bj JOIN users u ON bj.user_id = u.id WHERE u.email = #{userEmail} AND bj.created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH) AND bj.deleted_at IS NULL")
    int countJobsThisMonthByUserEmail(@Param("userEmail") String userEmail);

    @org.apache.ibatis.annotations.Select("SELECT COUNT(*) FROM basket_jobs bj JOIN users u ON bj.user_id = u.id WHERE u.email = #{userEmail} AND bj.created_at >= DATE_SUB(NOW(), INTERVAL 1 WEEK) AND bj.deleted_at IS NULL")
    int countJobsThisWeekByUserEmail(@Param("userEmail") String userEmail);

    void insertStudyInvite(StudyInviteRow row);
    List<StudyInviteRow> findInvitesByInviteeEmail(@Param("inviteeEmail") String inviteeEmail);
    StudyInviteRow findStudyInviteById(@Param("id") String id);
    void updateStudyInviteStatus(@Param("id") String id, @Param("status") String status);
    
    void insertSharedEssay(SharedEssayRow row);
    SharedEssayRow findSharedEssayById(@Param("id") String id);
    SharedEssayRow findSharedEssayByStudyUserWorkspace(
        @Param("studyId") String studyId,
        @Param("userEmail") String userEmail,
        @Param("workspaceId") String workspaceId
    );
    List<SharedEssayRow> findSharedEssaysByStudyId(@Param("studyId") String studyId);
    List<com.ezone.backend.dto.study.SharedEssayItemDto> findEssayItemsByVersionIds(@Param("versionIds") List<String> versionIds);
    void updateSharedEssayVersions(
        @Param("id") String id,
        @Param("versionIds") String versionIds,
        @Param("latestAddedVersionIds") String latestAddedVersionIds,
        @Param("updatedAt") java.time.LocalDateTime updatedAt
    );

    void insertEssayFeedback(EssayFeedbackRow row);
    List<EssayFeedbackRow> findFeedbackBySharedEssayId(@Param("sharedEssayId") String sharedEssayId);

    void insertSharedJob(SharedJobRow row);
    List<SharedJobRow> findSharedJobsByStudyId(@Param("studyId") String studyId);
    void updateStudyImageUrl(@Param("studyId") String studyId, @Param("imageUrl") String imageUrl);

    void insertEssayReadLog(StudyEssayReadLogRow row);
    @org.apache.ibatis.annotations.Select("SELECT COUNT(*) FROM study_essay_read_log WHERE essay_id = #{essayId} AND user_email = #{userEmail}")
    int countEssayReadLog(@Param("essayId") String essayId, @Param("userEmail") String userEmail);
    @org.apache.ibatis.annotations.Delete("DELETE FROM study_essay_read_log WHERE essay_id = #{essayId} AND user_email <> #{userEmail}")
    void deleteEssayReadLogsForEssayExceptUser(@Param("essayId") String essayId, @Param("userEmail") String userEmail);

    @org.apache.ibatis.annotations.Delete("DELETE FROM study_group WHERE id = #{studyId}")
    void deleteStudyGroup(@Param("studyId") String studyId);

    @org.apache.ibatis.annotations.Delete("DELETE FROM study_essay_read_log WHERE study_id = #{studyId}")
    void deleteStudyEssayReadLogsByStudyId(@Param("studyId") String studyId);

    @org.apache.ibatis.annotations.Delete("DELETE FROM essay_feedback WHERE shared_essay_id IN (SELECT id FROM shared_essay WHERE study_id = #{studyId})")
    void deleteEssayFeedbacksByStudyId(@Param("studyId") String studyId);

    @org.apache.ibatis.annotations.Delete("DELETE FROM shared_essay WHERE study_id = #{studyId}")
    void deleteSharedEssaysByStudyId(@Param("studyId") String studyId);

    @org.apache.ibatis.annotations.Delete("DELETE FROM shared_job WHERE study_id = #{studyId}")
    void deleteSharedJobsByStudyId(@Param("studyId") String studyId);

    @org.apache.ibatis.annotations.Delete("DELETE FROM study_invite WHERE study_id = #{studyId}")
    void deleteStudyInvitesByStudyId(@Param("studyId") String studyId);

    @org.apache.ibatis.annotations.Delete("DELETE FROM study_member WHERE study_id = #{studyId}")
    void deleteStudyMembersByStudyId(@Param("studyId") String studyId);

    @org.apache.ibatis.annotations.Delete("DELETE FROM study_member WHERE study_id = #{studyId} AND user_email = #{userEmail}")
    void deleteStudyMember(@Param("studyId") String studyId, @Param("userEmail") String userEmail);

    @org.apache.ibatis.annotations.Update("UPDATE study_member SET role = #{role} WHERE study_id = #{studyId} AND user_email = #{userEmail}")
    void updateStudyMemberRole(@Param("studyId") String studyId, @Param("userEmail") String userEmail, @Param("role") String role);
}
