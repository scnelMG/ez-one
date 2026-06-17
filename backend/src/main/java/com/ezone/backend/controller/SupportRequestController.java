package com.ezone.backend.controller;

import com.ezone.backend.dto.ApiResponse;
import com.ezone.backend.dto.support.CreateSupportRequest;
import com.ezone.backend.dto.support.SupportRequestResponse;
import com.ezone.backend.mapper.SupportRequestMapper;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SupportRequestController {

    private final SupportRequestMapper supportRequestMapper;

    public SupportRequestController(SupportRequestMapper supportRequestMapper) {
        this.supportRequestMapper = supportRequestMapper;
    }

    @GetMapping("/api/support/requests")
    public ApiResponse<List<SupportRequestResponse>> getMyRequests() {
        return ApiResponse.success(supportRequestMapper.findByUserId(CurrentUserSupport.currentUserId()));
    }

    @PostMapping("/api/support/requests")
    public ApiResponse<SupportRequestResponse> createRequest(@Valid @RequestBody CreateSupportRequest request) {
        Long userId = CurrentUserSupport.currentUserId();
        supportRequestMapper.insert(userId, normalize(request));
        return ApiResponse.success(supportRequestMapper.findByUserId(userId).stream()
            .findFirst()
            .orElseThrow(() -> new IllegalStateException("Created support request could not be loaded.")));
    }

    private CreateSupportRequest normalize(CreateSupportRequest request) {
        return new CreateSupportRequest(
            request.requestType().trim(),
            request.category().trim(),
            request.title().trim(),
            request.body().trim(),
            trimToNull(request.companyName()),
            trimToNull(request.contactName()),
            trimToNull(request.contactEmail()),
            trimToNull(request.contactPhone())
        );
    }

    private String trimToNull(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        return value.trim();
    }
}
