package com.ezone.backend.service;

import com.ezone.backend.domain.ApplicationStatus;
import com.ezone.backend.domain.ReferenceType;
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
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

@Service
@Profile("!mysql")
public class InMemoryP1WorkspaceService implements P1WorkspaceService {

    private final AtomicLong idGenerator = new AtomicLong(100);
    private final Map<Long, BasketRecord> basketJobs = new LinkedHashMap<>();
    private final Map<Long, WorkspaceRecord> workspaces = new LinkedHashMap<>();
    private final Map<Long, ReferenceRecord> references = new LinkedHashMap<>();
    private final Map<Long, VersionRecord> versions = new LinkedHashMap<>();

    public InMemoryP1WorkspaceService() {
        seed(1L, "네이버", "Backend Engineer", "오늘 18:00", true, ApplicationStatus.IN_PROGRESS);
        seed(1L, "카카오페이", "Server Developer", "D-2", true, ApplicationStatus.NOT_APPLIED);
        seed(1L, "토스", "Platform Engineer", "D-5", false, ApplicationStatus.COMPLETED);
    }

    @Override
    public DashboardSummaryResponse getDashboardSummary(Long userId) {
        List<BasketRecord> activeJobs = activeBasketJobs(userId);
        long inProgress = activeJobs.stream()
            .filter(job -> effectiveStatus(job) == ApplicationStatus.IN_PROGRESS)
            .count();
        long notStarted = activeJobs.stream()
            .filter(job -> effectiveStatus(job) == ApplicationStatus.NOT_APPLIED
                || effectiveStatus(job) == ApplicationStatus.READY)
            .count();
        long deadlineSoon = activeJobs.stream().filter(BasketRecord::deadlineSoon).count();

        return new DashboardSummaryResponse(
            activeJobs.size(),
            inProgress,
            notStarted,
            deadlineSoon,
            activeJobs.stream()
                .sorted(dashboardDeadlineComparator())
                .limit(5)
                .map(this::toDashboardJob)
                .toList()
        );
    }

    @Override
    public List<BasketJobResponse> listBasketJobs(Long userId, ApplicationStatus status, String sort) {
        return activeBasketJobs(userId).stream()
            .filter(job -> status == null || effectiveStatus(job) == status)
            .sorted(resolveBasketSort(sort))
            .map(this::toBasketResponse)
            .toList();
    }

    @Override
    public BasketJobResponse createBasketJob(Long userId, CreateBasketJobRequest request) {
        return createBasketJobWithQuestions(userId, request, List.of());
    }

    @Override
    public BasketJobResponse createBasketJobWithQuestions(
        Long userId,
        CreateBasketJobRequest request,
        List<CreateEssayQuestionRequest> questions
    ) {
        BasketRecord duplicate = activeBasketJobs(userId).stream()
            .filter(job -> job.companyName().equals(request.companyName()))
            .filter(job -> job.positionTitle().equals(request.positionTitle()))
            .findFirst()
            .orElse(null);

        if (duplicate != null) {
            return toBasketResponse(duplicate);
        }

        long basketJobId = idGenerator.incrementAndGet();
        long workspaceId = idGenerator.incrementAndGet();
        BasketRecord basketJob = new BasketRecord(
            basketJobId,
            userId,
            workspaceId,
            request.companyName(),
            request.positionTitle(),
            ApplicationStatus.NOT_APPLIED,
            normalizeDeadline(request.deadlineLabel()),
            isDeadlineSoon(request.deadlineLabel()),
            request.sourceUrl(),
            "",
            false
        );
        basketJobs.put(basketJobId, basketJob);
        createWorkspaceFor(basketJob, questions);
        return toBasketResponse(basketJob);
    }

    @Override
    public BasketJobResponse getBasketJob(Long userId, Long basketJobId) {
        return toBasketResponse(requireBasketJob(userId, basketJobId));
    }

    @Override
    public BasketJobResponse updateBasketJob(Long userId, Long basketJobId, UpdateBasketJobRequest request) {
        BasketRecord current = requireBasketJob(userId, basketJobId);
        ApplicationStatus status = current.applicationStatus();
        if (isPresent(request.applicationMemo())) {
            status = startedStatus(status);
        }
        BasketRecord updated = new BasketRecord(
            current.id(),
            current.userId(),
            current.workspaceId(),
            request.companyName(),
            request.positionTitle(),
            status,
            normalizeDeadline(request.deadlineLabel()),
            isDeadlineSoon(request.deadlineLabel()),
            request.sourceUrl(),
            normalizeMemo(request.applicationMemo()),
            current.deleted()
        );
        basketJobs.put(basketJobId, updated);

        WorkspaceRecord workspace = workspaces.get(current.workspaceId());
        if (workspace != null) {
            workspaces.put(workspace.id(), new WorkspaceRecord(
                workspace.id(),
                workspace.userId(),
                workspace.basketJobId(),
                updated.companyName(),
                updated.positionTitle(),
                updated.deadlineLabel(),
                statusLabel(updated.applicationStatus()),
                updated.sourceUrl(),
                workspace.questions()
            ));
        }

        return toBasketResponse(updated);
    }

    @Override
    public BasketJobResponse updateBasketJobStatus(Long userId, Long basketJobId, ApplicationStatus status) {
        BasketRecord current = requireBasketJob(userId, basketJobId);
        BasketRecord updated = new BasketRecord(
            current.id(),
            current.userId(),
            current.workspaceId(),
            current.companyName(),
            current.positionTitle(),
            status,
            current.deadlineLabel(),
            current.deadlineSoon(),
            current.sourceUrl(),
            current.applicationMemo(),
            current.deleted()
        );
        basketJobs.put(basketJobId, updated);
        return toBasketResponse(updated);
    }

    @Override
    public void archiveBasketJob(Long userId, Long basketJobId) {
        BasketRecord current = requireBasketJob(userId, basketJobId);
        basketJobs.put(basketJobId, new BasketRecord(
            current.id(),
            current.userId(),
            current.workspaceId(),
            current.companyName(),
            current.positionTitle(),
            current.applicationStatus(),
            current.deadlineLabel(),
            current.deadlineSoon(),
            current.sourceUrl(),
            current.applicationMemo(),
            true
        ));
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
    public EssayQuestionResponse createQuestion(Long userId, Long workspaceId, CreateEssayQuestionRequest request) {
        WorkspaceRecord workspace = requireWorkspace(userId, workspaceId);
        markWorkspaceInProgress(workspace);
        EssayQuestionRecord question = new EssayQuestionRecord(
            idGenerator.incrementAndGet(),
            request.prompt(),
            "",
            request.maxLength()
        );
        workspace.questions().add(question);
        return toQuestionResponse(question);
    }

    @Override
    public EssayQuestionResponse updateQuestion(
        Long userId,
        Long workspaceId,
        Long questionId,
        CreateEssayQuestionRequest request
    ) {
        WorkspaceRecord workspace = requireWorkspace(userId, workspaceId);
        markWorkspaceInProgress(workspace);
        EssayQuestionRecord current = workspace.questions().stream()
            .filter(item -> item.id().equals(questionId))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Question not found"));
        workspace.questions().remove(current);
        EssayQuestionRecord updated = new EssayQuestionRecord(
            current.id(),
            request.prompt(),
            current.draft(),
            request.maxLength()
        );
        workspace.questions().add(updated);
        return toQuestionResponse(updated);
    }

    @Override
    public void deleteQuestion(Long userId, Long workspaceId, Long questionId) {
        WorkspaceRecord workspace = requireWorkspace(userId, workspaceId);
        boolean removed = workspace.questions().removeIf(item -> item.id().equals(questionId));
        if (!removed) {
            throw new IllegalArgumentException("Question not found");
        }
        versions.entrySet().removeIf(entry ->
            entry.getValue().workspaceId().equals(workspaceId)
                && entry.getValue().questionId().equals(questionId)
        );
    }

    @Override
    public EssayQuestionResponse updateDraft(Long userId, Long workspaceId, Long draftId, UpdateDraftRequest request) {
        WorkspaceRecord workspace = requireWorkspace(userId, workspaceId);
        markWorkspaceInProgress(workspace);
        EssayQuestionRecord current = workspace.questions().stream()
            .filter(item -> item.id().equals(draftId))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Draft not found"));
        workspace.questions().remove(current);
        EssayQuestionRecord updated = new EssayQuestionRecord(
            current.id(),
            current.prompt(),
            request.body(),
            current.maxLength()
        );
        workspace.questions().add(updated);
        return toQuestionResponse(updated);
    }

    @Override
    public EssayVersionResponse createVersion(Long userId, Long workspaceId, CreateEssayVersionRequest request) {
        WorkspaceRecord workspace = requireWorkspace(userId, workspaceId);
        EssayQuestionRecord question = workspace.questions().stream()
            .filter(item -> item.id().equals(request.questionId()))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Question not found"));
        VersionRecord version = new VersionRecord(
            idGenerator.incrementAndGet(),
            userId,
            workspaceId,
            question.id(),
            request.versionName(),
            question.draft()
        );
        versions.put(version.id(), version);
        return toVersionResponse(version);
    }

    @Override
    public List<EssayVersionResponse> listVersions(Long userId, Long workspaceId) {
        requireWorkspace(userId, workspaceId);
        return versions.values().stream()
            .filter(version -> version.userId().equals(userId))
            .filter(version -> version.workspaceId().equals(workspaceId))
            .map(this::toVersionResponse)
            .toList();
    }

    @Override
    public CompareEssayVersionsResponse compareVersions(
        Long userId,
        Long workspaceId,
        CompareEssayVersionsRequest request
    ) {
        requireWorkspace(userId, workspaceId);
        VersionRecord left = requireVersion(userId, workspaceId, request.leftVersionId());
        VersionRecord right = requireVersion(userId, workspaceId, request.rightVersionId());
        return new CompareEssayVersionsResponse(
            left.id(),
            right.id(),
            left.body(),
            right.body(),
            !Objects.equals(left.body(), right.body())
        );
    }

    @Override
    public List<ReferenceResponse> listReferences(Long userId, Long workspaceId) {
        requireWorkspace(userId, workspaceId);
        return references.values().stream()
            .filter(reference -> reference.userId().equals(userId))
            .filter(reference -> reference.workspaceId().equals(workspaceId))
            .filter(reference -> !reference.deleted())
            .map(this::toReferenceResponse)
            .toList();
    }

    @Override
    public ReferenceResponse createReference(Long userId, Long workspaceId, CreateReferenceRequest request) {
        WorkspaceRecord workspace = requireWorkspace(userId, workspaceId);
        markWorkspaceInProgress(workspace);
        ReferenceRecord reference = new ReferenceRecord(
            idGenerator.incrementAndGet(),
            userId,
            workspaceId,
            request.boardName(),
            request.referenceType(),
            request.title(),
            request.body(),
            request.url(),
            false
        );
        references.put(reference.id(), reference);
        return toReferenceResponse(reference);
    }

    @Override
    public ReferenceResponse getReference(Long userId, Long referenceId) {
        return toReferenceResponse(requireReference(userId, referenceId));
    }

    @Override
    public ReferenceResponse updateReference(Long userId, Long referenceId, CreateReferenceRequest request) {
        ReferenceRecord current = requireReference(userId, referenceId);
        WorkspaceRecord workspace = requireWorkspace(userId, current.workspaceId());
        markWorkspaceInProgress(workspace);
        ReferenceRecord updated = new ReferenceRecord(
            current.id(),
            current.userId(),
            current.workspaceId(),
            request.boardName(),
            request.referenceType(),
            request.title(),
            request.body(),
            request.url(),
            current.deleted()
        );
        references.put(referenceId, updated);
        return toReferenceResponse(updated);
    }

    @Override
    public void deleteReference(Long userId, Long referenceId) {
        ReferenceRecord current = requireReference(userId, referenceId);
        references.put(referenceId, new ReferenceRecord(
            current.id(),
            current.userId(),
            current.workspaceId(),
            current.boardName(),
            current.referenceType(),
            current.title(),
            current.body(),
            current.url(),
            true
        ));
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

    private void seed(
        Long userId,
        String companyName,
        String positionTitle,
        String deadlineLabel,
        boolean deadlineSoon,
        ApplicationStatus status
    ) {
        long basketJobId = idGenerator.incrementAndGet();
        long workspaceId = idGenerator.incrementAndGet();
        BasketRecord basketJob = new BasketRecord(
            basketJobId,
            userId,
            workspaceId,
            companyName,
            positionTitle,
            status,
            deadlineLabel,
            deadlineSoon,
            "https://www.jasoseol.com/",
            "",
            false
        );
        basketJobs.put(basketJobId, basketJob);
        createWorkspaceFor(basketJob, List.of());
    }

    private void createWorkspaceFor(BasketRecord basketJob, List<CreateEssayQuestionRequest> extractedQuestions) {
        List<EssayQuestionRecord> questions = new ArrayList<>();
        if (extractedQuestions.isEmpty()) {
            questions.add(new EssayQuestionRecord(
                idGenerator.incrementAndGet(),
                "문항 1. 지원 동기와 입사 후 기여 계획을 작성하세요.",
                "서비스 사용 경험과 백엔드 개선 경험을 연결해 초안을 작성합니다.",
                1000
            ));
        } else {
            extractedQuestions.forEach(question -> questions.add(new EssayQuestionRecord(
                idGenerator.incrementAndGet(),
                question.prompt(),
                "",
                question.maxLength()
            )));
        }
        WorkspaceRecord workspace = new WorkspaceRecord(
            basketJob.workspaceId(),
            basketJob.userId(),
            basketJob.id(),
            basketJob.companyName(),
            basketJob.positionTitle(),
            basketJob.deadlineLabel(),
            statusLabel(basketJob.applicationStatus()),
            basketJob.sourceUrl(),
            questions
        );
        workspaces.put(workspace.id(), workspace);

        ReferenceRecord reference = new ReferenceRecord(
            idGenerator.incrementAndGet(),
            basketJob.userId(),
            workspace.id(),
            "JD",
            ReferenceType.JD,
            "JD 핵심 역량",
            "사용자가 직접 정리한 직무 요구사항입니다.",
            basketJob.sourceUrl(),
            false
        );
        references.put(reference.id(), reference);
    }

    private List<BasketRecord> activeBasketJobs(Long userId) {
        return basketJobs.values().stream()
            .filter(job -> job.userId().equals(userId))
            .filter(job -> !job.deleted())
            .toList();
    }

    private Comparator<BasketRecord> resolveBasketSort(String sort) {
        if ("deadline".equalsIgnoreCase(sort)) {
            return Comparator.comparingInt((BasketRecord record) -> DeadlineLabelRanker.rank(record.deadlineLabel()))
                .thenComparing(BasketRecord::id);
        }
        return Comparator.comparing(BasketRecord::id);
    }

    private Comparator<BasketRecord> dashboardDeadlineComparator() {
        return Comparator.comparingInt((BasketRecord record) -> DeadlineLabelRanker.rank(record.deadlineLabel()))
            .thenComparing(BasketRecord::id);
    }

    private BasketRecord requireBasketJob(Long userId, Long basketJobId) {
        BasketRecord record = basketJobs.get(basketJobId);
        if (record == null || record.deleted()) {
            throw new IllegalArgumentException("Basket job not found");
        }
        if (!record.userId().equals(userId)) {
            throw new IllegalArgumentException("Basket job is not owned by current user");
        }
        return record;
    }

    private WorkspaceRecord requireWorkspace(Long userId, Long workspaceId) {
        WorkspaceRecord record = workspaces.get(workspaceId);
        if (record == null) {
            throw new IllegalArgumentException("Workspace not found");
        }
        if (!record.userId().equals(userId)) {
            throw new IllegalArgumentException("Workspace is not owned by current user");
        }
        return record;
    }

    private ReferenceRecord requireReference(Long userId, Long referenceId) {
        ReferenceRecord record = references.get(referenceId);
        if (record == null || record.deleted()) {
            throw new IllegalArgumentException("Reference not found");
        }
        if (!record.userId().equals(userId)) {
            throw new IllegalArgumentException("Reference is not owned by current user");
        }
        return record;
    }

    private VersionRecord requireVersion(Long userId, Long workspaceId, Long versionId) {
        VersionRecord record = versions.get(versionId);
        if (record == null) {
            throw new IllegalArgumentException("Version not found");
        }
        if (!record.userId().equals(userId) || !record.workspaceId().equals(workspaceId)) {
            throw new IllegalArgumentException("Version is not owned by current user");
        }
        return record;
    }

    private BasketJobResponse toBasketResponse(BasketRecord record) {
        ApplicationStatus status = effectiveStatus(record);
        return new BasketJobResponse(
            record.id(),
            record.workspaceId(),
            record.companyName(),
            record.positionTitle(),
            status,
            statusLabel(status),
            record.deadlineLabel(),
            record.deadlineSoon(),
            record.sourceUrl(),
            record.applicationMemo()
        );
    }

    private DashboardJobResponse toDashboardJob(BasketRecord record) {
        return new DashboardJobResponse(
            record.id(),
            record.workspaceId(),
            record.companyName(),
            record.positionTitle(),
            record.deadlineLabel()
        );
    }

    private WorkspaceResponse toWorkspaceResponse(WorkspaceRecord record) {
        return new WorkspaceResponse(
            record.id(),
            record.basketJobId(),
            record.companyName(),
            record.positionTitle(),
            record.deadlineLabel(),
            record.statusLabel(),
            record.sourceUrl(),
            new CompanyDetailsResponse(
                CompanyDetailDefaults.domainFromUrl(record.sourceUrl()),
                CompanyDetailDefaults.UNKNOWN_KO,
                CompanyDetailDefaults.UNKNOWN_KO,
                null,
                null,
                CompanyDetailDefaults.UNVERIFIED
            ),
            record.questions().stream().map(this::toQuestionResponse).toList(),
            listReferences(record.userId(), record.id())
        );
    }

    private EssayQuestionResponse toQuestionResponse(EssayQuestionRecord record) {
        return new EssayQuestionResponse(
            record.id(),
            record.prompt(),
            record.draft(),
            record.maxLength(),
            record.draft().length()
        );
    }

    private ReferenceResponse toReferenceResponse(ReferenceRecord record) {
        return new ReferenceResponse(
            record.id(),
            record.boardName(),
            record.referenceType(),
            record.title(),
            record.body(),
            record.url()
        );
    }

    private EssayVersionResponse toVersionResponse(VersionRecord record) {
        return new EssayVersionResponse(record.id(), record.questionId(), record.versionName(), record.body());
    }

    private String normalizeDeadline(String deadlineLabel) {
        return deadlineLabel == null || deadlineLabel.isBlank() ? "미정" : deadlineLabel;
    }

    private boolean isDeadlineSoon(String deadlineLabel) {
        return deadlineLabel != null && (deadlineLabel.contains("오늘") || deadlineLabel.contains("D-"));
    }

    private ApplicationStatus effectiveStatus(BasketRecord record) {
        if (record.applicationStatus() == ApplicationStatus.COMPLETED) {
            return ApplicationStatus.COMPLETED;
        }

        LocalDate deadline = parseDeadlineDate(record.deadlineLabel());
        if (deadline != null && deadline.isBefore(LocalDate.now())) {
            return ApplicationStatus.NOT_APPLIED;
        }

        return record.applicationStatus();
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

    private void markWorkspaceInProgress(WorkspaceRecord workspace) {
        BasketRecord current = basketJobs.get(workspace.basketJobId());
        if (current == null || current.deleted()) {
            return;
        }
        ApplicationStatus status = startedStatus(current.applicationStatus());
        if (status == current.applicationStatus()) {
            return;
        }
        BasketRecord updated = new BasketRecord(
            current.id(),
            current.userId(),
            current.workspaceId(),
            current.companyName(),
            current.positionTitle(),
            status,
            current.deadlineLabel(),
            current.deadlineSoon(),
            current.sourceUrl(),
            current.applicationMemo(),
            current.deleted()
        );
        basketJobs.put(current.id(), updated);
        workspaces.put(workspace.id(), new WorkspaceRecord(
            workspace.id(),
            workspace.userId(),
            workspace.basketJobId(),
            workspace.companyName(),
            workspace.positionTitle(),
            workspace.deadlineLabel(),
            statusLabel(status),
            workspace.sourceUrl(),
            workspace.questions()
        ));
    }

    private ApplicationStatus startedStatus(ApplicationStatus current) {
        if (current == ApplicationStatus.COMPLETED || current == ApplicationStatus.IN_PROGRESS) {
            return current;
        }
        return ApplicationStatus.IN_PROGRESS;
    }

    private String statusLabel(ApplicationStatus status) {
        return switch (status) {
            case READY, NOT_APPLIED -> "지원 전";
            case IN_PROGRESS -> "진행 중";
            case COMPLETED -> "지원 완료";
        };
    }

    private record BasketRecord(
        Long id,
        Long userId,
        Long workspaceId,
        String companyName,
        String positionTitle,
        ApplicationStatus applicationStatus,
        String deadlineLabel,
        boolean deadlineSoon,
        String sourceUrl,
        String applicationMemo,
        boolean deleted
    ) {
    }

    private record WorkspaceRecord(
        Long id,
        Long userId,
        Long basketJobId,
        String companyName,
        String positionTitle,
        String deadlineLabel,
        String statusLabel,
        String sourceUrl,
        List<EssayQuestionRecord> questions
    ) {
    }

    private record EssayQuestionRecord(Long id, String prompt, String draft, int maxLength) {
    }

    private record ReferenceRecord(
        Long id,
        Long userId,
        Long workspaceId,
        String boardName,
        ReferenceType referenceType,
        String title,
        String body,
        String url,
        boolean deleted
    ) {
    }

    private record VersionRecord(
        Long id,
        Long userId,
        Long workspaceId,
        Long questionId,
        String versionName,
        String body
    ) {
    }
}
