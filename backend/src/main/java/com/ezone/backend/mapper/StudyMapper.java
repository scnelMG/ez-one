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

    void insertStudyInvite(StudyInviteRow row);
    
    void insertSharedEssay(SharedEssayRow row);
    SharedEssayRow findSharedEssayById(@Param("id") String id);
    List<SharedEssayRow> findSharedEssaysByStudyId(@Param("studyId") String studyId);
    List<com.ezone.backend.dto.study.SharedEssayItemDto> findEssayItemsByVersionIds(@Param("versionIds") List<String> versionIds);

    void insertEssayFeedback(EssayFeedbackRow row);
    List<EssayFeedbackRow> findFeedbackBySharedEssayId(@Param("sharedEssayId") String sharedEssayId);

    void insertSharedJob(SharedJobRow row);
    List<SharedJobRow> findSharedJobsByStudyId(@Param("studyId") String studyId);
    void updateStudyImageUrl(@Param("studyId") String studyId, @Param("imageUrl") String imageUrl);
}
