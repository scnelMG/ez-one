package com.ezone.backend.mapper;

import com.ezone.backend.domain.ApplicationStatus;
import com.ezone.backend.domain.persistence.BasketJobRow;
import com.ezone.backend.domain.persistence.EssayQuestionRow;
import com.ezone.backend.domain.persistence.EssayVersionRow;
import com.ezone.backend.domain.persistence.JobRow;
import com.ezone.backend.domain.persistence.ReferenceMaterialRow;
import com.ezone.backend.domain.persistence.WorkspaceRow;
import java.util.List;
import java.util.Optional;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface P1WorkspaceMapper {

    void upsertCompany(JobRow row);

    void recordCompanyInfoSource(
        @Param("companyId") Long companyId,
        @Param("sourceName") String sourceName,
        @Param("sourceUrl") String sourceUrl,
        @Param("status") String status
    );

    void insertJob(JobRow row);

    int updateJob(JobRow row);

    Optional<BasketJobRow> findDuplicateBasketJob(
        @Param("userId") Long userId,
        @Param("companyName") String companyName,
        @Param("sourceUrl") String sourceUrl,
        @Param("positionTitle") String positionTitle
    );

    void insertBasketJob(BasketJobRow row);

    void insertWorkspace(WorkspaceRow row);

    void insertEssayQuestion(EssayQuestionRow row);

    void insertEssayDraft(EssayQuestionRow row);

    void insertReferenceMaterial(ReferenceMaterialRow row);

    List<BasketJobRow> listBasketJobs(
        @Param("userId") Long userId,
        @Param("status") ApplicationStatus status,
        @Param("sort") String sort
    );

    List<JobRow> listRecommendationJobs();

    Optional<JobRow> findRecommendationJob(@Param("recommendationId") Long recommendationId);

    Optional<BasketJobRow> findBasketJob(@Param("userId") Long userId, @Param("basketJobId") Long basketJobId);

    Optional<Long> findBasketJobOwner(@Param("basketJobId") Long basketJobId);

    int updateBasketJobStatus(
        @Param("userId") Long userId,
        @Param("basketJobId") Long basketJobId,
        @Param("status") ApplicationStatus status
    );

    int updateBasketJobMemo(
        @Param("userId") Long userId,
        @Param("basketJobId") Long basketJobId,
        @Param("applicationMemo") String applicationMemo
    );

    int markBasketJobInProgress(@Param("userId") Long userId, @Param("basketJobId") Long basketJobId);

    int markWorkspaceBasketJobInProgress(@Param("userId") Long userId, @Param("workspaceId") Long workspaceId);

    int archiveBasketJob(@Param("userId") Long userId, @Param("basketJobId") Long basketJobId);

    Optional<WorkspaceRow> findWorkspace(@Param("userId") Long userId, @Param("workspaceId") Long workspaceId);

    Optional<Long> findWorkspaceOwner(@Param("workspaceId") Long workspaceId);

    List<EssayQuestionRow> listQuestions(@Param("workspaceId") Long workspaceId);

    Optional<EssayQuestionRow> findQuestion(
        @Param("workspaceId") Long workspaceId,
        @Param("questionId") Long questionId
    );

    int updateDraft(@Param("questionId") Long questionId, @Param("body") String body);

    int updateQuestion(EssayQuestionRow row);

    int deleteQuestionVersions(@Param("workspaceId") Long workspaceId, @Param("questionId") Long questionId);

    int deleteQuestionDraft(@Param("workspaceId") Long workspaceId, @Param("questionId") Long questionId);

    int deleteQuestion(@Param("workspaceId") Long workspaceId, @Param("questionId") Long questionId);

    void insertEssayVersion(EssayVersionRow row);

    List<EssayVersionRow> listVersions(@Param("userId") Long userId, @Param("workspaceId") Long workspaceId);

    Optional<EssayVersionRow> findVersion(
        @Param("userId") Long userId,
        @Param("workspaceId") Long workspaceId,
        @Param("versionId") Long versionId
    );

    List<ReferenceMaterialRow> listReferences(@Param("workspaceId") Long workspaceId);

    Optional<ReferenceMaterialRow> findReference(
        @Param("userId") Long userId,
        @Param("referenceId") Long referenceId
    );

    Optional<Long> findReferenceOwner(@Param("referenceId") Long referenceId);

    int updateReference(ReferenceMaterialRow row);

    int deleteReference(@Param("userId") Long userId, @Param("referenceId") Long referenceId);
}
