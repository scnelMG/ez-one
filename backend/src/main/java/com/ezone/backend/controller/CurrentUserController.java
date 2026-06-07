package com.ezone.backend.controller;

import com.ezone.backend.domain.UserAccount;
import com.ezone.backend.dto.ApiResponse;
import com.ezone.backend.dto.auth.CurrentUserResponse;
import com.ezone.backend.dto.auth.UpdateCurrentUserRequest;
import com.ezone.backend.mapper.UserAccountMapper;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class CurrentUserController {

    private final UserAccountMapper userAccountMapper;

    public CurrentUserController(UserAccountMapper userAccountMapper) {
        this.userAccountMapper = userAccountMapper;
    }

    @GetMapping("/api/me")
    public ApiResponse<CurrentUserResponse> getCurrentUser() {
        return ApiResponse.success(toResponse(loadCurrentUser()));
    }

    @PatchMapping("/api/me")
    public ApiResponse<CurrentUserResponse> updateCurrentUser(@Valid @RequestBody UpdateCurrentUserRequest request) {
        Long userId = CurrentUserSupport.currentUserId();
        userAccountMapper.updateNickname(userId, request.nickname().trim());

        return ApiResponse.success(toResponse(loadCurrentUser()));
    }

    private UserAccount loadCurrentUser() {
        return userAccountMapper.findById(CurrentUserSupport.currentUserId())
            .orElseThrow(() -> new IllegalStateException("Authenticated user could not be loaded."));
    }

    private CurrentUserResponse toResponse(UserAccount user) {
        return new CurrentUserResponse(
            user.id(),
            user.email(),
            user.name(),
            user.nickname(),
            user.profileCompleted(),
            false
        );
    }
}
