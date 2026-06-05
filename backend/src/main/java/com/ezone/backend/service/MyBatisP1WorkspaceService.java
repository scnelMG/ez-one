package com.ezone.backend.service;

import com.ezone.backend.domain.ApplicationStatus;
import com.ezone.backend.domain.ReferenceType;
import com.ezone.backend.domain.persistence.BasketJobRow;
import com.ezone.backend.domain.persistence.EssayQuestionRow;
import com.ezone.backend.domain.persistence.EssayVersionRow;
import com.ezone.backend.domain.persistence.JobRow;
import com.ezone.backend.domain.persistence.ReferenceMaterialRow;
import com.ezone.backend.domain.persistence.WorkspaceRow;
import com.ezone.backend.dto.basket.BasketJobResponse;
import com.ezone.backend.dto.basket.CreateBasketJobRequest;
import com.ezone.backend.dto.basket.UpdateBasketJobRequest;
import com.ezone.backend.dto.dashboard.DashboardJobResponse;
import com.ezone.backend.dto.dashboard.DashboardSummaryResponse;
import com.ezone.backend.dto.workspace.CompareEssayVersionsRequest;
import com.ezone.backend.dto.workspace.CompareEssayVersionsResponse;
import com.ezone.backend.dto.workspace.CompanyDetailsResponse;
import com.ezone.backend.dto.workspace.CreateEssayQuestionRequest;
import com.ezone.backend.dto.workspace.CreateEssayVersionRequest;
import com.ezone.backend.dto.workspace.CreateReferenceRequest;
import com.ezone.backend.dto.workspace.EssayQuestionResponse;
import com.ezone.backend.dto.workspace.EssayVersionResponse;
import com.ezone.backend.dto.workspace.ReferenceResponse;
import com.ezone.backend.dto.workspace.UpdateDraftRequest;
import com.ezone.backend.dto.workspace.WorkspaceDefaultsResponse;
import com.ezone.backend.dto.workspace.WorkspaceResponse;
import com.ezone.backend.mapper.P1WorkspaceMapper;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Profile("mysql")
public class MyBatisP1WorkspaceService implements P1WorkspaceService {

    private final P1WorkspaceMapper mapper;

    public MyBatisP1WorkspaceService(P1WorkspaceMapper mapper) {
        this.mapper = mapper;
    }

    @Override
    public DashboardSummaryResponse getDashboardSummary(Long userId) {
        List<BasketJobRow> jobs = mapper.listBasketJobs(userId, null, null);
        long inProgress = jobs.stream()
            .filter(job -> effectiveStatus(job) == ApplicationStatus.IN_PROGRESS)
            .count();
        long notStarted = jobs.stream()
            .filter(job -> effectiveStatus(job) == ApplicationStatus.NOT_APPLIED
                || effectiveStatus(job) == ApplicationStatus.READY)
            .count();
        long deadlineSoon = jobs.stream().filter(BasketJobRow::isDeadlineSoon).count();
        return new DashboardSummaryResponse(
            jobs.size(),
            inProgress,
            notStarted,
            deadlineSoon,
            jobs.stream()
                .sorted(dashboardDeadlineComparator())
                .limit(5)
                .map(this::toDashboardJob)
                .toList()
        );
    }

    @Override
    public List<BasketJobResponse> listBasketJobs(Long userId, ApplicationStatus status, String sort) {
        return mapper.listBasketJobs(userId, null, sort).stream()
            .filter(job -> status == null || effectiveStatus(job) == status)
            .map(this::toBasketResponse)
            .toList();
    }

    @Override
    @Transactional
    public BasketJobResponse createBasketJob(Long userId, CreateBasketJobRequest request) {
        return createBasketJobWithQuestions(userId, request, List.of());
    }

    @Override
    @Transactional
    public BasketJobResponse createBasketJobWithQuestions(
        Long userId,
        CreateBasketJobRequest request,
        List<CreateEssayQuestionRequest> questions
    ) {
        BasketJobRow duplicate = mapper.findDuplicateBasketJob(
                userId,
                request.companyName(),
                request.positionTitle(),
                request.sourceUrl()
            )
            .orElse(null);

        if (duplicate != null) {
            return toBasketResponse(duplicate);
        }

        JobRow job = new JobRow();
        job.setCompanyName(request.companyName());
        job.setPositionTitle(request.positionTitle());
        job.setDeadlineLabel(normalizeDeadline(request.deadlineLabel()));
        job.setSourceUrl(request.sourceUrl());
        mapper.upsertCompany(job);
        mapper.insertJob(job);

        BasketJobRow basketJob = new BasketJobRow();
        basketJob.setUserId(userId);
        basketJob.setJobId(job.getId());
        basketJob.setCompanyName(request.companyName());
        basketJob.setPositionTitle(request.positionTitle());
        basketJob.setApplicationStatus(ApplicationStatus.NOT_APPLIED);
        basketJob.setDeadlineLabel(job.getDeadlineLabel());
        basketJob.setDeadlineSoon(isDeadlineSoon(job.getDeadlineLabel()));
        basketJob.setSourceUrl(request.sourceUrl());
        basketJob.setApplicationMemo("");
        mapper.insertBasketJob(basketJob);

        WorkspaceRow workspace = new WorkspaceRow();
        workspace.setUserId(userId);
        workspace.setBasketJobId(basketJob.getId());
        mapper.insertWorkspace(workspace);
        basketJob.setWorkspaceId(workspace.getId());

        if (questions.isEmpty()) {
            insertInitialQuestion(workspace.getId(), "문항 1. 지원 동기와 입사 후 기여 계획을 작성하세요.", 1000);
        } else {
            questions.forEach(question -> insertInitialQuestion(
                workspace.getId(),
                question.prompt(),
                question.maxLength()
            ));
        }

        ReferenceMaterialRow reference = new ReferenceMaterialRow();
        reference.setUserId(userId);
        reference.setWorkspaceId(workspace.getId());
        reference.setBoardName("JD");
        reference.setReferenceType(ReferenceType.JD);
        reference.setTitle("JD 핵심 역량");
        reference.setBody("사용자가 직접 정리한 직무 요구사항입니다.");
        reference.setUrl(request.sourceUrl());
        mapper.insertReferenceMaterial(reference);

        return toBasketResponse(basketJob);
    }

    private void insertInitialQuestion(Long workspaceId, String prompt, int maxLength) {
        EssayQuestionRow question = new EssayQuestionRow();
        question.setWorkspaceId(workspaceId);
        question.setPrompt(prompt);
        question.setDraft("");
        question.setMaxLength(maxLength);
        mapper.insertEssayQuestion(question);
        mapper.insertEssayDraft(question);
    }

    @Override
    public BasketJobResponse getBasketJob(Long userId, Long basketJobId) {
        return toBasketResponse(requireBasketJob(userId, basketJobId));
    }

    @Override
    @Transactional
    public BasketJobResponse updateBasketJob(Long userId, Long basketJobId, UpdateBasketJobRequest request) {
        BasketJobRow current = requireBasketJob(userId, basketJobId);
        JobRow job = new JobRow();
        job.setId(current.getJobId());
        job.setCompanyName(request.companyName());
        job.setPositionTitle(request.positionTitle());
        job.setDeadlineLabel(normalizeDeadline(request.deadlineLabel()));
        job.setSourceUrl(request.sourceUrl());
        mapper.upsertCompany(job);
        if (mapper.updateJob(job) == 0) {
            throw new IllegalArgumentException("Basket job not found");
        }
        if (mapper.updateBasketJobMemo(userId, basketJobId, normalizeMemo(request.applicationMemo())) == 0) {
            throw new IllegalArgumentException("Basket job not found");
        }
        if (isPresent(request.applicationMemo())) {
            mapper.markBasketJobInProgress(userId, basketJobId);
        }
        return getBasketJob(userId, basketJobId);
    }

    @Override
    public BasketJobResponse updateBasketJobStatus(Long userId, Long basketJobId, ApplicationStatus status) {
        if (mapper.updateBasketJobStatus(userId, basketJobId, status) == 0) {
            throw new IllegalArgumentException("Basket job not found");
        }
        return getBasketJob(userId, basketJobId);
    }

    @Override
    public void archiveBasketJob(Long userId, Long basketJobId) {
        if (mapper.archiveBasketJob(userId, basketJobId) == 0) {
            throw new IllegalArgumentException("Basket job not found");
        }
    }

    @Override
    public WorkspaceResponse getWorkspace(Long userId, Long workspaceId) {
        return toWorkspaceResponse(requireWorkspace(userId, workspaceId));
    }

    @Override
    public WorkspaceDefaultsResponse getWorkspaceDefaults(Long userId, Long workspaceId) {
        requireWorkspace(userId, workspaceId);
        Map<String, Object> sections = new LinkedHashMap<>();
        sections.put("basicInfo", Map.of("nameKo", "", "email", ""));
        sections.put("projects", List.of());
        sections.put("awards", List.of());
        return new WorkspaceDefaultsResponse(workspaceId, sections);
    }

    @Override
    @Transactional
    public EssayQuestionResponse createQuestion(Long userId, Long workspaceId, CreateEssayQuestionRequest request) {
        requireWorkspace(userId, workspaceId);
        EssayQuestionRow question = new EssayQuestionRow();
        question.setWorkspaceId(workspaceId);
        question.setPrompt(request.prompt());
        question.setDraft("");
        question.setMaxLength(request.maxLength());
        mapper.insertEssayQuestion(question);
        mapper.insertEssayDraft(question);
        mapper.markWorkspaceBasketJobInProgress(userId, workspaceId);
        return toQuestionResponse(question);
    }

    @Override
    @Transactional
    public EssayQuestionResponse updateQuestion(
        Long userId,
        Long workspaceId,
        Long questionId,
        CreateEssayQuestionRequest request
    ) {
        requireWorkspace(userId, workspaceId);
        EssayQuestionRow question = mapper.findQuestion(workspaceId, questionId)
            .orElseThrow(() -> new IllegalArgumentException("Question not found"));
        question.setPrompt(request.prompt());
        question.setMaxLength(request.maxLength());
        if (mapper.updateQuestion(question) == 0) {
            throw new IllegalArgumentException("Question not found");
        }
        mapper.markWorkspaceBasketJobInProgress(userId, workspaceId);
        return toQuestionResponse(question);
    }

    @Override
    @Transactional
    public void deleteQuestion(Long userId, Long workspaceId, Long questionId) {
        requireWorkspace(userId, workspaceId);
        mapper.findQuestion(workspaceId, questionId)
            .orElseThrow(() -> new IllegalArgumentException("Question not found"));
        mapper.deleteQuestionVersions(workspaceId, questionId);
        mapper.deleteQuestionDraft(workspaceId, questionId);
        if (mapper.deleteQuestion(workspaceId, questionId) == 0) {
            throw new IllegalArgumentException("Question not found");
        }
    }

    @Override
    @Transactional
    public EssayQuestionResponse updateDraft(Long userId, Long workspaceId, Long draftId, UpdateDraftRequest request) {
        requireWorkspace(userId, workspaceId);
        EssayQuestionRow question = mapper.findQuestion(workspaceId, draftId)
            .orElseThrow(() -> new IllegalArgumentException("Draft not found"));
        mapper.updateDraft(draftId, request.body());
        mapper.markWorkspaceBasketJobInProgress(userId, workspaceId);
        question.setDraft(request.body());
        return toQuestionResponse(question);
    }

    @Override
    public EssayVersionResponse createVersion(Long userId, Long workspaceId, CreateEssayVersionRequest request) {
        requireWorkspace(userId, workspaceId);
        EssayQuestionRow question = mapper.findQuestion(workspaceId, request.questionId())
            .orElseThrow(() -> new IllegalArgumentException("Question not found"));
        EssayVersionRow version = new EssayVersionRow();
        version.setUserId(userId);
        version.setWorkspaceId(workspaceId);
        version.setQuestionId(question.getId());
        version.setVersionName(request.versionName());
        version.setBody(question.getDraft());
        mapper.insertEssayVersion(version);
        return toVersionResponse(version);
    }

    @Override
    public List<EssayVersionResponse> listVersions(Long userId, Long workspaceId) {
        requireWorkspace(userId, workspaceId);
        return mapper.listVersions(userId, workspaceId).stream().map(this::toVersionResponse).toList();
    }

    @Override
    public CompareEssayVersionsResponse compareVersions(
        Long userId,
        Long workspaceId,
        CompareEssayVersionsRequest request
    ) {
        requireWorkspace(userId, workspaceId);
        EssayVersionRow left = mapper.findVersion(userId, workspaceId, request.leftVersionId())
            .orElseThrow(() -> new IllegalArgumentException("Version not found"));
        EssayVersionRow right = mapper.findVersion(userId, workspaceId, request.rightVersionId())
            .orElseThrow(() -> new IllegalArgumentException("Version not found"));
        return new CompareEssayVersionsResponse(
            left.getId(),
            right.getId(),
            left.getBody(),
            right.getBody(),
            !Objects.equals(left.getBody(), right.getBody())
        );
    }

    @Override
    public List<ReferenceResponse> listReferences(Long userId, Long workspaceId) {
        requireWorkspace(userId, workspaceId);
        return mapper.listReferences(workspaceId).stream().map(this::toReferenceResponse).toList();
    }

    @Override
    @Transactional
    public ReferenceResponse createReference(Long userId, Long workspaceId, CreateReferenceRequest request) {
        requireWorkspace(userId, workspaceId);
        ReferenceMaterialRow reference = new ReferenceMaterialRow();
        reference.setUserId(userId);
        reference.setWorkspaceId(workspaceId);
        reference.setBoardName(request.boardName());
        reference.setReferenceType(request.referenceType());
        reference.setTitle(request.title());
        reference.setBody(request.body());
        reference.setUrl(request.url());
        mapper.insertReferenceMaterial(reference);
        mapper.markWorkspaceBasketJobInProgress(userId, workspaceId);
        return toReferenceResponse(reference);
    }

    @Override
    public ReferenceResponse getReference(Long userId, Long referenceId) {
        return toReferenceResponse(requireReference(userId, referenceId));
    }

    @Override
    @Transactional
    public ReferenceResponse updateReference(Long userId, Long referenceId, CreateReferenceRequest request) {
        ReferenceMaterialRow current = requireReference(userId, referenceId);
        current.setBoardName(request.boardName());
        current.setReferenceType(request.referenceType());
        current.setTitle(request.title());
        current.setBody(request.body());
        current.setUrl(request.url());
        if (mapper.updateReference(current) == 0) {
            throw new IllegalArgumentException("Reference not found");
        }
        mapper.markWorkspaceBasketJobInProgress(userId, current.getWorkspaceId());
        return toReferenceResponse(current);
    }

    @Override
    public void deleteReference(Long userId, Long referenceId) {
        if (mapper.deleteReference(userId, referenceId) == 0) {
            throw new IllegalArgumentException("Reference not found");
        }
    }

    @Override
    public List<DashboardJobResponse> listRecommendationJobs(Long userId) {
        return List.of(
            new DashboardJobResponse(9001L, null, "라인", "Server Platform Engineer", "D-7"),
            new DashboardJobResponse(9002L, null, "오늘의집", "Commerce Backend Developer", "D-10")
        );
    }

    @Override
    public BasketJobResponse saveRecommendation(Long userId, Long recommendationId) {
        if (recommendationId == 9002L) {
            return createBasketJob(userId, new CreateBasketJobRequest(
                "오늘의집",
                "Commerce Backend Developer",
                "D-10",
                "https://www.jasoseol.com/",
                "RECOMMENDATION"
            ));
        }

        return createBasketJob(userId, new CreateBasketJobRequest(
            "라인",
            "Server Platform Engineer",
            "D-7",
            "https://www.jasoseol.com/",
            "RECOMMENDATION"
        ));
    }

    private BasketJobRow requireBasketJob(Long userId, Long basketJobId) {
        return mapper.findBasketJob(userId, basketJobId)
            .orElseThrow(() -> new IllegalArgumentException("Basket job not found"));
    }

    private WorkspaceRow requireWorkspace(Long userId, Long workspaceId) {
        return mapper.findWorkspace(userId, workspaceId)
            .orElseThrow(() -> new IllegalArgumentException("Workspace not found"));
    }

    private ReferenceMaterialRow requireReference(Long userId, Long referenceId) {
        return mapper.findReference(userId, referenceId)
            .orElseThrow(() -> new IllegalArgumentException("Reference not found"));
    }

    private BasketJobResponse toBasketResponse(BasketJobRow row) {
        ApplicationStatus status = effectiveStatus(row);
        return new BasketJobResponse(
            row.getId(),
            row.getWorkspaceId(),
            row.getCompanyName(),
            row.getPositionTitle(),
            status,
            statusLabel(status),
            row.getDeadlineLabel(),
            row.isDeadlineSoon(),
            row.getSourceUrl(),
            normalizeMemo(row.getApplicationMemo())
        );
    }

    private Comparator<BasketJobRow> dashboardDeadlineComparator() {
        return Comparator.comparingInt((BasketJobRow row) -> DeadlineLabelRanker.rank(row.getDeadlineLabel()))
            .thenComparing(BasketJobRow::getId);
    }

    private DashboardJobResponse toDashboardJob(BasketJobRow row) {
        return new DashboardJobResponse(
            row.getId(),
            row.getWorkspaceId(),
            row.getCompanyName(),
            row.getPositionTitle(),
            row.getDeadlineLabel()
        );
    }

    private WorkspaceResponse toWorkspaceResponse(WorkspaceRow row) {
        ApplicationStatus status = effectiveStatus(row.getApplicationStatus(), row.getDeadlineLabel());
        return new WorkspaceResponse(
            row.getId(),
            row.getBasketJobId(),
            row.getCompanyName(),
            row.getPositionTitle(),
            row.getDeadlineLabel(),
            statusLabel(status),
            row.getSourceUrl(),
            new CompanyDetailsResponse(
                row.getCompanyDomain(),
                row.getCompanyType(),
                row.getCompanySize(),
                row.getCompanyRating(),
                row.getCompanyStartingSalary(),
                row.getCompanyFinancialStatus()
            ),
            mapper.listQuestions(row.getId()).stream().map(this::toQuestionResponse).toList(),
            mapper.listReferences(row.getId()).stream().map(this::toReferenceResponse).toList()
        );
    }

    private EssayQuestionResponse toQuestionResponse(EssayQuestionRow row) {
        return new EssayQuestionResponse(
            row.getId(),
            row.getPrompt(),
            row.getDraft(),
            row.getMaxLength(),
            row.getDraft().length()
        );
    }

    private ReferenceResponse toReferenceResponse(ReferenceMaterialRow row) {
        return new ReferenceResponse(
            row.getId(),
            row.getBoardName(),
            row.getReferenceType(),
            row.getTitle(),
            row.getBody(),
            row.getUrl()
        );
    }

    private EssayVersionResponse toVersionResponse(EssayVersionRow row) {
        return new EssayVersionResponse(row.getId(), row.getQuestionId(), row.getVersionName(), row.getBody());
    }

    private String normalizeDeadline(String deadlineLabel) {
        return deadlineLabel == null || deadlineLabel.isBlank() ? "미정" : deadlineLabel;
    }

    private boolean isDeadlineSoon(String deadlineLabel) {
        return deadlineLabel != null && (deadlineLabel.contains("오늘") || deadlineLabel.contains("D-"));
    }

    private ApplicationStatus effectiveStatus(BasketJobRow row) {
        return effectiveStatus(row.getApplicationStatus(), row.getDeadlineLabel());
    }

    private ApplicationStatus effectiveStatus(ApplicationStatus current, String deadlineLabel) {
        if (current == ApplicationStatus.COMPLETED) {
            return ApplicationStatus.COMPLETED;
        }

        LocalDate deadline = parseDeadlineDate(deadlineLabel);
        if (deadline != null && deadline.isBefore(LocalDate.now())) {
            return ApplicationStatus.NOT_APPLIED;
        }

        return current;
    }

    private LocalDate parseDeadlineDate(String deadlineLabel) {
        if (deadlineLabel == null || deadlineLabel.isBlank()) {
            return null;
        }

        for (DateTimeFormatter formatter : List.of(
            DateTimeFormatter.ofPattern("yyyy.MM.dd"),
            DateTimeFormatter.ISO_LOCAL_DATE
        )) {
            try {
                return LocalDate.parse(deadlineLabel.trim(), formatter);
            } catch (DateTimeParseException ignored) {
                // Try the next supported deadline label format.
            }
        }

        return null;
    }

    private String normalizeMemo(String applicationMemo) {
        return applicationMemo == null ? "" : applicationMemo;
    }

    private boolean isPresent(String value) {
        return value != null && !value.isBlank();
    }

    private String statusLabel(ApplicationStatus status) {
        return switch (status) {
            case READY, NOT_APPLIED -> "지원 전";
            case IN_PROGRESS -> "진행 중";
            case COMPLETED -> "지원 완료";
        };
    }
}
