package com.ezone.backend.controller;

import com.ezone.backend.dto.ApiResponse;
import com.ezone.backend.dto.extension.ApplicationActivityAssistRequest;
import com.ezone.backend.dto.extension.ApplicationActivityAssistResponse;
import com.ezone.backend.service.ApplicationActivityAssistService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ApplicationActivityAssistController {

    private final ApplicationActivityAssistService applicationActivityAssistService;

    public ApplicationActivityAssistController(ApplicationActivityAssistService applicationActivityAssistService) {
        this.applicationActivityAssistService = applicationActivityAssistService;
    }

    @PostMapping("/api/extension/application-assist/activities")
    public ApiResponse<ApplicationActivityAssistResponse> recommendActivities(
        @RequestBody ApplicationActivityAssistRequest request
    ) {
        return ApiResponse.success(applicationActivityAssistService.recommend(CurrentUserSupport.currentUserId(), request));
    }
}
