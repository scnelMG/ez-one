package com.ezone.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ezone.backend.client.GoogleOAuthClient;
import com.ezone.backend.domain.UserAccount;
import com.ezone.backend.dto.auth.AuthTokenResponse;
import com.ezone.backend.dto.auth.EmailLoginRequest;
import com.ezone.backend.dto.auth.GoogleLoginRequest;
import com.ezone.backend.dto.auth.GoogleUserProfile;
import com.ezone.backend.dto.auth.SignupRequest;
import com.ezone.backend.mapper.UserAccountMapper;
import com.ezone.backend.security.AuthTokenIssuer;
import com.ezone.backend.security.IssuedTokenPair;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class DefaultAuthServiceTest {

    @Mock
    private GoogleOAuthClient googleOAuthClient;

    @Mock
    private UserAccountMapper userAccountMapper;

    @Mock
    private AuthTokenIssuer authTokenIssuer;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AuthenticationManager authenticationManager;

    @InjectMocks
    private DefaultAuthService authService;

    @Test
    void loginWithGoogleCreatesUserAndIssuesTokens() {
        GoogleLoginRequest request = new GoogleLoginRequest(
            "google-oauth-code",
            "http://localhost:5173/login/callback"
        );
        GoogleUserProfile profile = new GoogleUserProfile(
            "google-subject",
            "user@example.com",
            "홍길동",
            "길동"
        );
        UserAccount createdUser = new UserAccount(
            1L,
            "google-subject",
            "user@example.com",
            "홍길동",
            "길동",
            false
        );

        when(googleOAuthClient.verifyAuthorizationCode(request)).thenReturn(profile);
        when(userAccountMapper.findByGoogleSubject("google-subject")).thenReturn(Optional.empty());
        when(userAccountMapper.findByEmail("user@example.com")).thenReturn(Optional.empty());
        when(userAccountMapper.createFromGoogleProfile(profile)).thenReturn(createdUser);
        when(authTokenIssuer.issueFor(createdUser)).thenReturn(
            new IssuedTokenPair("access-token", "refresh-token", 3600)
        );

        AuthTokenResponse response = authService.loginWithGoogle(request);

        assertThat(response.accessToken()).isEqualTo("access-token");
        assertThat(response.refreshToken()).isEqualTo("refresh-token");
        assertThat(response.tokenType()).isEqualTo("Bearer");
        assertThat(response.expiresIn()).isEqualTo(3600);
        assertThat(response.user().email()).isEqualTo("user@example.com");
        assertThat(response.user().profileCompleted()).isFalse();
        assertThat(response.user().onboardingRequired()).isTrue();
        verify(userAccountMapper).createFromGoogleProfile(profile);
    }

    @Test
    void loginWithGoogleLinksExistingEmailWhenSubjectIsMissing() {
        GoogleLoginRequest request = new GoogleLoginRequest(
            "google-oauth-code",
            "http://localhost:5173/login/callback"
        );
        GoogleUserProfile profile = new GoogleUserProfile(
            "new-google-subject",
            "user@example.com",
            "User",
            "User"
        );
        UserAccount existingUser = new UserAccount(
            1L,
            null,
            "user@example.com",
            "User",
            "User",
            true
        );
        UserAccount linkedUser = new UserAccount(
            1L,
            "new-google-subject",
            "user@example.com",
            "User",
            "User",
            true
        );

        when(googleOAuthClient.verifyAuthorizationCode(request)).thenReturn(profile);
        when(userAccountMapper.findByGoogleSubject("new-google-subject"))
            .thenReturn(Optional.empty())
            .thenReturn(Optional.of(linkedUser));
        when(userAccountMapper.findByEmail("user@example.com")).thenReturn(Optional.of(existingUser));
        when(authTokenIssuer.issueFor(linkedUser)).thenReturn(
            new IssuedTokenPair("access-token", "refresh-token", 3600)
        );

        AuthTokenResponse response = authService.loginWithGoogle(request);

        assertThat(response.accessToken()).isEqualTo("access-token");
        assertThat(response.user().profileCompleted()).isTrue();
        assertThat(response.user().onboardingRequired()).isFalse();
        verify(userAccountMapper).linkGoogleProfile(profile);
    }

    @Test
    void loginWithGoogleDoesNotRequireOnboardingForExistingIncompleteUser() {
        GoogleLoginRequest request = new GoogleLoginRequest(
            "google-oauth-code",
            "http://localhost:5173/login/callback"
        );
        GoogleUserProfile profile = new GoogleUserProfile(
            "google-subject",
            "user@example.com",
            "Hong Gil Dong",
            "Gil Dong"
        );
        UserAccount existingUser = new UserAccount(
            1L,
            "google-subject",
            "user@example.com",
            "Hong Gil Dong",
            "Gil Dong",
            false
        );

        when(googleOAuthClient.verifyAuthorizationCode(request)).thenReturn(profile);
        when(userAccountMapper.findByGoogleSubject("google-subject")).thenReturn(Optional.of(existingUser));
        when(authTokenIssuer.issueFor(existingUser)).thenReturn(
            new IssuedTokenPair("access-token", "refresh-token", 3600)
        );

        AuthTokenResponse response = authService.loginWithGoogle(request);

        assertThat(response.user().profileCompleted()).isFalse();
        assertThat(response.user().onboardingRequired()).isFalse();
    }

    @Test
    void signupRejectsDuplicateEmail() {
        SignupRequest request = new SignupRequest("local@example.com", "password123!", "Local User");
        when(userAccountMapper.findByEmail("local@example.com")).thenReturn(Optional.of(
            new UserAccount(
                2L,
                null,
                "local@example.com",
                "Local User",
                "Local User",
                false
            )
        ));

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> authService.signup(request))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("Email is already registered.");
    }

    @Test
    void signupHashesPasswordCreatesLocalUserAndIssuesTokens() {
        SignupRequest request = new SignupRequest("local@example.com", "password123!", "Local User");
        UserAccount createdUser = new UserAccount(
            2L,
            null,
            "local@example.com",
            "Local User",
            "Local User",
            false
        );

        when(userAccountMapper.findByEmail("local@example.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("password123!")).thenReturn("bcrypt-hash");
        when(userAccountMapper.createLocalUser("local@example.com", "Local User", "bcrypt-hash")).thenReturn(createdUser);
        when(authTokenIssuer.issueFor(createdUser)).thenReturn(
            new IssuedTokenPair("access-token", "refresh-token", 3600)
        );

        AuthTokenResponse response = authService.signup(request);

        assertThat(response.accessToken()).isEqualTo("access-token");
        assertThat(response.user().email()).isEqualTo("local@example.com");
        assertThat(response.user().onboardingRequired()).isTrue();
        verify(userAccountMapper).createLocalUser("local@example.com", "Local User", "bcrypt-hash");
    }

    @Test
    void emailLoginRejectsInvalidPassword() {
        EmailLoginRequest request = new EmailLoginRequest("local@example.com", "wrong-password");
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
            .thenThrow(new BadCredentialsException("Bad credentials"));

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> authService.loginWithEmail(request))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("Email or password is invalid.");
    }

    @Test
    void emailLoginIssuesTokensForMatchingPassword() {
        EmailLoginRequest request = new EmailLoginRequest("local@example.com", "password123!");
        UserAccount user = new UserAccount(
            2L,
            null,
            "local@example.com",
            "Local User",
            "Local User",
            true
        );

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
            .thenReturn(new UsernamePasswordAuthenticationToken("local@example.com", null));
        when(userAccountMapper.findByEmail("local@example.com")).thenReturn(Optional.of(user));
        when(authTokenIssuer.issueFor(user)).thenReturn(new IssuedTokenPair("access-token", "refresh-token", 3600));

        AuthTokenResponse response = authService.loginWithEmail(request);

        assertThat(response.accessToken()).isEqualTo("access-token");
        assertThat(response.user().profileCompleted()).isTrue();
        assertThat(response.user().onboardingRequired()).isFalse();
        verify(authenticationManager).authenticate(argThat(authentication ->
            "local@example.com".equals(authentication.getPrincipal())
                && "password123!".equals(authentication.getCredentials())
        ));
    }
}
