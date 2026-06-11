package com.ezone.backend.controller;

import com.ezone.backend.dto.ApiResponse;
import com.ezone.backend.dto.basket.BasketJobResponse;
import com.ezone.backend.dto.basket.CreateBasketJobRequest;
import com.ezone.backend.dto.extension.ExtensionJobPreviewRequest;
import com.ezone.backend.dto.extension.ExtensionJobPreviewResponse;
import com.ezone.backend.dto.extension.ExtensionJobSaveRequest;
import com.ezone.backend.dto.workspace.CreateEssayQuestionRequest;
import com.ezone.backend.service.NotionIntegrationService;
import com.ezone.backend.service.P1WorkspaceService;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/extension/jobs")
public class ExtensionJobController {

    private final P1WorkspaceService workspaceService;
    private final NotionIntegrationService notionIntegrationService;

    public ExtensionJobController(P1WorkspaceService workspaceService, NotionIntegrationService notionIntegrationService) {
        this.workspaceService = workspaceService;
        this.notionIntegrationService = notionIntegrationService;
    }

    @PostMapping("/preview")
    public ApiResponse<ExtensionJobPreviewResponse> preview(@RequestBody ExtensionJobPreviewRequest request) {
        boolean saveable = hasText(request.companyName())
            && hasText(request.positionTitle())
            && hasText(request.sourceUrl());
        return ApiResponse.success(new ExtensionJobPreviewResponse(
            saveable,
            request.companyName(),
            request.positionTitle(),
            request.deadlineLabel(),
            request.sourceUrl(),
            request.logoUrl(),
            saveable ? "저장 가능한 공고입니다." : "회사명, 직무, 원문 URL은 필수입니다."
        ));
    }

    @PostMapping("/save")
    public ApiResponse<List<BasketJobResponse>> save(@RequestBody ExtensionJobSaveRequest request) {
        if (!hasText(request.companyName()) || !hasText(request.sourceUrl())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Company name and source URL are required.");
        }
        if (!isHttpUrl(request.sourceUrl())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Source URL must be an HTTP(S) URL.");
        }

        List<String> rawRoles = request.selectedRoles().isEmpty()
            ? fallbackRole(request.positionTitle())
            : request.selectedRoles();
        List<String> roles = rawRoles.stream()
            .filter(this::hasText)
            .map(String::trim)
            .distinct()
            .toList();
        if (roles.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "At least one role is required.");
        }

        List<CreateEssayQuestionRequest> questions = request.essayQuestions().stream()
            .filter(question -> hasText(question.prompt()))
            .map(question -> new CreateEssayQuestionRequest(question.prompt(), question.maxLengthOrDefault()))
            .toList();

        Long userId = CurrentUserSupport.currentUserId();
        List<BasketJobResponse> savedJobs = roles.stream()
            .map(role -> workspaceService.createBasketJobWithQuestions(
                userId,
                new CreateBasketJobRequest(
                    request.companyName(),
                    role,
                    request.deadlineLabel(),
                    request.sourceUrl(),
                    request.logoUrl(),
                    "EXTENSION"
                ),
                questionsForRole(request, role, questions)
            ))
            .toList();
        savedJobs.forEach(savedJob -> notionIntegrationService.recordJobOnlySync(userId, savedJob));
        return ApiResponse.success(savedJobs);
    }

    private List<String> fallbackRole(String positionTitle) {
        return hasText(positionTitle) ? List.of(positionTitle) : List.of();
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private List<CreateEssayQuestionRequest> questionsForRole(
        ExtensionJobSaveRequest request,
        String role,
        List<CreateEssayQuestionRequest> fallbackQuestions
    ) {
        List<CreateEssayQuestionRequest> roleQuestions = request.roleEssayQuestions()
            .getOrDefault(role, List.of())
            .stream()
            .filter(question -> hasText(question.prompt()))
            .map(question -> new CreateEssayQuestionRequest(question.prompt(), question.maxLengthOrDefault()))
            .toList();
        return roleQuestions.isEmpty() ? fallbackQuestions : roleQuestions;
    }

    private boolean isHttpUrl(String value) {
        return value != null && value.matches("^https?://\\S+$");
    }
}
