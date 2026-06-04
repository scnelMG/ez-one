package com.ezone.backend.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.ezone.backend.domain.UserAccount;
import com.ezone.backend.mapper.UserAccountMapper;
import com.ezone.backend.mapper.UserSessionMapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class JwtAuthTokenIssuerTest {

    @Mock
    private UserSessionMapper userSessionMapper;

    @Test
    void issueForCreatesJwtAndStoresOnlyRefreshTokenHash() {
        JwtAuthTokenIssuer issuer = new JwtAuthTokenIssuer(
            new ObjectMapper(),
            mock(UserAccountMapper.class),
            userSessionMapper,
            "access-secret-for-test-access-secret-for-test",
            "refresh-secret-for-test-refresh-secret-for-test",
            30,
            14,
            Clock.fixed(Instant.parse("2026-06-04T00:00:00Z"), ZoneOffset.UTC)
        );
        UserAccount user = new UserAccount(
            1L,
            "google-subject",
            "user@example.com",
            "홍길동",
            "길동",
            false
        );

        IssuedTokenPair tokens = issuer.issueFor(user);

        assertThat(tokens.accessToken()).contains(".");
        assertThat(tokens.refreshToken()).contains(".");
        assertThat(tokens.expiresIn()).isEqualTo(1800);
        verify(userSessionMapper).insertSession(argThat(session ->
            session.userId().equals(1L)
                && !session.refreshTokenHash().equals(tokens.refreshToken())
                && session.refreshTokenHash().length() >= 64
                && session.expiresAt().equals(Instant.parse("2026-06-18T00:00:00Z"))
                && session.revokedAt() == null
        ));
    }
}
