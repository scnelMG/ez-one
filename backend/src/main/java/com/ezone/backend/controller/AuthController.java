package com.ezone.backend.controller;

import com.ezone.backend.dto.ApiResponse;
import com.ezone.backend.dto.auth.AuthTokenResponse;
import com.ezone.backend.dto.auth.GoogleLoginRequest;
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
}
