package com.ezone.backend.controller;

import com.ezone.backend.dto.ApiResponse;
import com.ezone.backend.dto.auth.AuthTokenResponse;
import com.ezone.backend.dto.auth.EmailLoginRequest;
import com.ezone.backend.dto.auth.GoogleLoginRequest;
import com.ezone.backend.dto.auth.LogoutResponse;
import com.ezone.backend.dto.auth.RefreshTokenRequest;
import com.ezone.backend.dto.auth.SignupRequest;
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

    @PostMapping("/signup")
    public ApiResponse<AuthTokenResponse> signup(@Valid @RequestBody SignupRequest request) {
        return ApiResponse.success(authService.signup(request));
    }

    @PostMapping("/login")
    public ApiResponse<AuthTokenResponse> loginWithEmail(@Valid @RequestBody EmailLoginRequest request) {
        return ApiResponse.success(authService.loginWithEmail(request));
    }

    @PostMapping("/google")
    public ApiResponse<AuthTokenResponse> loginWithGoogle(
        @Valid @RequestBody GoogleLoginRequest request
    ) {
        return ApiResponse.success(authService.loginWithGoogle(request));
    }

    @PostMapping("/refresh")
    public ApiResponse<AuthTokenResponse> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return ApiResponse.success(authService.refresh(request));
    }

    @PostMapping("/logout")
    public ApiResponse<LogoutResponse> logout(@Valid @RequestBody RefreshTokenRequest request) {
        authService.logout(request);
        return ApiResponse.success(new LogoutResponse(true));
    }
}
