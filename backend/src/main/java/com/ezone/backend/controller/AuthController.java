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
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    static final String REFRESH_COOKIE_NAME = "ezone_refresh_token";

    private final AuthService authService;
    private final boolean refreshCookieSecure;
    private final String refreshCookieSameSite;
    private final Duration refreshCookieMaxAge;

    public AuthController(
        AuthService authService,
        @Value("${auth.refresh-cookie.secure:false}") boolean refreshCookieSecure,
        @Value("${auth.refresh-cookie.same-site:Lax}") String refreshCookieSameSite,
        @Value("${auth.refresh-cookie.max-age-seconds:2592000}") long refreshCookieMaxAgeSeconds
    ) {
        this.authService = authService;
        this.refreshCookieSecure = refreshCookieSecure;
        this.refreshCookieSameSite = refreshCookieSameSite;
        this.refreshCookieMaxAge = Duration.ofSeconds(refreshCookieMaxAgeSeconds);
    }

    @PostMapping("/signup")
    public ResponseEntity<ApiResponse<AuthTokenResponse>> signup(@Valid @RequestBody SignupRequest request) {
        return withRefreshCookie(authService.signup(request));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthTokenResponse>> loginWithEmail(@Valid @RequestBody EmailLoginRequest request) {
        return withRefreshCookie(authService.loginWithEmail(request));
    }

    @PostMapping("/google")
    public ResponseEntity<ApiResponse<AuthTokenResponse>> loginWithGoogle(
        @Valid @RequestBody GoogleLoginRequest request
    ) {
        return withRefreshCookie(authService.loginWithGoogle(request));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthTokenResponse>> refresh(
        @Valid @RequestBody(required = false) RefreshTokenRequest request,
        @CookieValue(name = REFRESH_COOKIE_NAME, required = false) String refreshCookie
    ) {
        AuthTokenResponse response = authService.refresh(refreshRequestFrom(request, refreshCookie));
        return refreshCookie != null && !refreshCookie.isBlank()
            ? withRefreshCookie(response)
            : withRefreshCookieAndBodyToken(response);
    }

    @PostMapping("/extension-session")
    public ApiResponse<AuthTokenResponse> issueExtensionSession() {
        return ApiResponse.success(authService.issueExtensionSession(CurrentUserSupport.currentUserId()));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<LogoutResponse>> logout(
        @Valid @RequestBody(required = false) RefreshTokenRequest request,
        @CookieValue(name = REFRESH_COOKIE_NAME, required = false) String refreshCookie
    ) {
        String refreshToken = refreshTokenFrom(request, refreshCookie);
        if (refreshToken != null) {
            authService.logout(new RefreshTokenRequest(refreshToken));
        }
        return ResponseEntity.ok()
            .header(HttpHeaders.SET_COOKIE, clearRefreshCookie().toString())
            .body(ApiResponse.success(new LogoutResponse(true)));
    }

    private ResponseEntity<ApiResponse<AuthTokenResponse>> withRefreshCookie(AuthTokenResponse response) {
        return ResponseEntity.ok()
            .header(HttpHeaders.SET_COOKIE, refreshCookie(response.refreshToken()).toString())
            .body(ApiResponse.success(withoutRefreshToken(response)));
    }

    private ResponseEntity<ApiResponse<AuthTokenResponse>> withRefreshCookieAndBodyToken(AuthTokenResponse response) {
        return ResponseEntity.ok()
            .header(HttpHeaders.SET_COOKIE, refreshCookie(response.refreshToken()).toString())
            .body(ApiResponse.success(response));
    }

    private AuthTokenResponse withoutRefreshToken(AuthTokenResponse response) {
        return new AuthTokenResponse(
            response.accessToken(),
            null,
            response.tokenType(),
            response.expiresIn(),
            response.user()
        );
    }

    private RefreshTokenRequest refreshRequestFrom(RefreshTokenRequest request, String refreshCookie) {
        String refreshToken = refreshTokenFrom(request, refreshCookie);
        if (refreshToken == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Refresh token is required.");
        }
        return new RefreshTokenRequest(refreshToken);
    }

    private String refreshTokenFrom(RefreshTokenRequest request, String refreshCookie) {
        if (refreshCookie != null && !refreshCookie.isBlank()) {
            return refreshCookie;
        }
        if (request != null && request.refreshToken() != null && !request.refreshToken().isBlank()) {
            return request.refreshToken();
        }
        return null;
    }

    private ResponseCookie refreshCookie(String refreshToken) {
        return ResponseCookie.from(REFRESH_COOKIE_NAME, refreshToken)
            .httpOnly(true)
            .secure(refreshCookieSecure)
            .sameSite(refreshCookieSameSite)
            .path("/api/auth")
            .maxAge(refreshCookieMaxAge)
            .build();
    }

    private ResponseCookie clearRefreshCookie() {
        return ResponseCookie.from(REFRESH_COOKIE_NAME, "")
            .httpOnly(true)
            .secure(refreshCookieSecure)
            .sameSite(refreshCookieSameSite)
            .path("/api/auth")
            .maxAge(Duration.ZERO)
            .build();
    }
}
