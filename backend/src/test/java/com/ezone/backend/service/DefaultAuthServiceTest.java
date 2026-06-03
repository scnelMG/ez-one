package com.ezone.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ezone.backend.client.GoogleOAuthClient;
import com.ezone.backend.domain.UserAccount;
import com.ezone.backend.dto.auth.AuthTokenResponse;
import com.ezone.backend.dto.auth.GoogleLoginRequest;
import com.ezone.backend.dto.auth.GoogleUserProfile;
import com.ezone.backend.mapper.UserAccountMapper;
import com.ezone.backend.security.AuthTokenIssuer;
import com.ezone.backend.security.IssuedTokenPair;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class DefaultAuthServiceTest {

    @Mock
    private GoogleOAuthClient googleOAuthClient;

    @Mock
    private UserAccountMapper userAccountMapper;

    @Mock
    private AuthTokenIssuer authTokenIssuer;

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
        verify(userAccountMapper).createFromGoogleProfile(profile);
    }
}
