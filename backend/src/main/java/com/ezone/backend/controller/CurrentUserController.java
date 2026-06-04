package com.ezone.backend.controller;

import com.ezone.backend.dto.ApiResponse;
import com.ezone.backend.dto.auth.CurrentUserResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class CurrentUserController {

    @GetMapping("/api/me")
    public ApiResponse<CurrentUserResponse> getCurrentUser() {
        return ApiResponse.success(new CurrentUserResponse(
            CurrentUserSupport.currentUserId(),
            CurrentUserSupport.currentUserEmail(),
            "EZ One 사용자",
            "EZ One 사용자",
            true
        ));
    }
}
