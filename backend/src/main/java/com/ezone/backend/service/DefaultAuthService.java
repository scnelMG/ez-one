package com.ezone.backend.service;

import com.ezone.backend.client.GoogleOAuthClient;
import com.ezone.backend.domain.UserAccount;
import com.ezone.backend.dto.auth.AuthTokenResponse;
import com.ezone.backend.dto.auth.CurrentUserResponse;
import com.ezone.backend.dto.auth.EmailLoginRequest;
import com.ezone.backend.dto.auth.GoogleLoginRequest;
import com.ezone.backend.dto.auth.GoogleUserProfile;
import com.ezone.backend.dto.auth.RefreshTokenRequest;
import com.ezone.backend.dto.auth.SignupRequest;
import com.ezone.backend.mapper.UserAccountMapper;
import com.ezone.backend.security.AuthTokenIssuer;
import com.ezone.backend.security.IssuedTokenPair;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class DefaultAuthService implements AuthService {

    private final GoogleOAuthClient googleOAuthClient;
    private final UserAccountMapper userAccountMapper;
    private final AuthTokenIssuer authTokenIssuer;
    private final PasswordEncoder passwordEncoder;

    public DefaultAuthService(
        GoogleOAuthClient googleOAuthClient,
        UserAccountMapper userAccountMapper,
        AuthTokenIssuer authTokenIssuer,
        PasswordEncoder passwordEncoder
    ) {
        this.googleOAuthClient = googleOAuthClient;
        this.userAccountMapper = userAccountMapper;
        this.authTokenIssuer = authTokenIssuer;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public AuthTokenResponse signup(SignupRequest request) {
        String email = normalizeEmail(request.email());
        if (userAccountMapper.findByEmail(email).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email is already registered.");
        }

        String displayName = request.name().trim();
        UserAccount user = userAccountMapper.createLocalUser(
            email,
            displayName,
            passwordEncoder.encode(request.password())
        );

        return toAuthTokenResponse(authTokenIssuer.issueFor(user), user);
    }

    @Override
    public AuthTokenResponse loginWithEmail(EmailLoginRequest request) {
        String email = normalizeEmail(request.email());
        UserAccount user = userAccountMapper.findByEmail(email)
            .orElseThrow(DefaultAuthService::invalidEmailLogin);
        String passwordHash = userAccountMapper.findPasswordHashByEmail(email)
            .orElseThrow(DefaultAuthService::invalidEmailLogin);

        if (!passwordEncoder.matches(request.password(), passwordHash)) {
            throw invalidEmailLogin();
        }

        return toAuthTokenResponse(authTokenIssuer.issueFor(user), user);
    }

    @Override
    public AuthTokenResponse loginWithGoogle(GoogleLoginRequest request) {
        GoogleUserProfile profile = googleOAuthClient.verifyAuthorizationCode(request);
        UserAccount user = userAccountMapper.findByGoogleSubject(profile.subject())
            .orElseGet(() -> userAccountMapper.createFromGoogleProfile(profile));
        IssuedTokenPair tokens = authTokenIssuer.issueFor(user);

        return new AuthTokenResponse(
            tokens.accessToken(),
            tokens.refreshToken(),
            "Bearer",
            tokens.expiresIn(),
            new CurrentUserResponse(
                user.id(),
                user.email(),
                user.name(),
                user.nickname(),
                user.profileCompleted()
            )
        );
    }

    @Override
    public AuthTokenResponse refresh(RefreshTokenRequest request) {
        IssuedTokenPair tokens = authTokenIssuer.refresh(request.refreshToken());
        UserAccount user = userAccountMapper.findById(extractUserId(tokens.accessToken()))
            .orElseThrow(() -> new IllegalStateException("Issued access token user could not be loaded."));

        return toAuthTokenResponse(tokens, user);
    }

    @Override
    public void logout(RefreshTokenRequest request) {
        authTokenIssuer.revoke(request.refreshToken());
    }

    private AuthTokenResponse toAuthTokenResponse(IssuedTokenPair tokens, UserAccount user) {
        return new AuthTokenResponse(
            tokens.accessToken(),
            tokens.refreshToken(),
            "Bearer",
            tokens.expiresIn(),
            new CurrentUserResponse(
                user.id(),
                user.email(),
                user.name(),
                user.nickname(),
                user.profileCompleted()
            )
        );
    }

    private Long extractUserId(String accessToken) {
        try {
            String payload = accessToken.split("\\.")[1];
            String json = new String(java.util.Base64.getUrlDecoder().decode(payload), java.nio.charset.StandardCharsets.UTF_8);
            int start = json.indexOf("\"sub\":\"") + "\"sub\":\"".length();
            int end = json.indexOf("\"", start);
            return Long.valueOf(json.substring(start, end));
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to read issued access token user id.", exception);
        }
    }

    private static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private static ResponseStatusException invalidEmailLogin() {
        return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Email or password is invalid.");
    }
}
