package com.ezone.backend.controller;

import com.ezone.backend.dto.ApiResponse;
import com.ezone.backend.dto.auth.AuthTokenResponse;
import com.ezone.backend.dto.auth.CurrentUserResponse;
import com.ezone.backend.dto.auth.GoogleLoginRequest;
import com.ezone.backend.dto.auth.RefreshTokenRequest;
import com.ezone.backend.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/google")
    public ApiResponse<AuthTokenResponse> loginWithGoogle(
        @Valid @RequestBody GoogleLoginRequest request
    ) {
        return ApiResponse.success(authService.loginWithGoogle(request));
    }

    @PostMapping("/refresh")
    public ApiResponse<AuthTokenResponse> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return ApiResponse.success(new AuthTokenResponse(
            "dev-access-token",
            request.refreshToken(),
            "Bearer",
            1800,
            new CurrentUserResponse(
                1L,
                "user@example.com",
                "EZ One 사용자",
                "EZ One 사용자",
                true
            )
        ));
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout(@Valid @RequestBody RefreshTokenRequest request) {
        return ApiResponse.success(null);
    }
}
