package com.ezone.backend.security;

import com.ezone.backend.domain.UserAccount;
import com.ezone.backend.domain.UserSession;
import com.ezone.backend.mapper.UserAccountMapper;
import com.ezone.backend.mapper.UserSessionMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

@Component
@Primary
public class JwtAuthTokenIssuer implements AuthTokenIssuer {

    private static final TypeReference<Map<String, Object>> PAYLOAD_TYPE = new TypeReference<>() {
    };

    private final ObjectMapper objectMapper;
    private final UserAccountMapper userAccountMapper;
    private final UserSessionMapper userSessionMapper;
    private final String accessSecret;
    private final String refreshSecret;
    private final long accessTtlMinutes;
    private final long refreshTtlDays;
    private final Clock clock;

    @Autowired
    public JwtAuthTokenIssuer(
        ObjectMapper objectMapper,
        UserAccountMapper userAccountMapper,
        UserSessionMapper userSessionMapper,
        @Value("${auth.jwt.access-secret}") String accessSecret,
        @Value("${auth.jwt.refresh-secret}") String refreshSecret,
        @Value("${auth.jwt.access-ttl-minutes}") long accessTtlMinutes,
        @Value("${auth.jwt.refresh-ttl-days}") long refreshTtlDays
    ) {
        this(
            objectMapper,
            userAccountMapper,
            userSessionMapper,
            accessSecret,
            refreshSecret,
            accessTtlMinutes,
            refreshTtlDays,
            Clock.systemUTC()
        );
    }

    JwtAuthTokenIssuer(
        ObjectMapper objectMapper,
        UserAccountMapper userAccountMapper,
        UserSessionMapper userSessionMapper,
        String accessSecret,
        String refreshSecret,
        long accessTtlMinutes,
        long refreshTtlDays,
        Clock clock
    ) {
        this.objectMapper = objectMapper;
        this.userAccountMapper = userAccountMapper;
        this.userSessionMapper = userSessionMapper;
        this.accessSecret = accessSecret;
        this.refreshSecret = refreshSecret;
        this.accessTtlMinutes = accessTtlMinutes;
        this.refreshTtlDays = refreshTtlDays;
        this.clock = clock;
    }

    @Override
    public IssuedTokenPair issueFor(UserAccount user) {
        Instant issuedAt = clock.instant();
        Instant accessExpiresAt = issuedAt.plus(accessTtlMinutes, ChronoUnit.MINUTES);
        Instant refreshExpiresAt = issuedAt.plus(refreshTtlDays, ChronoUnit.DAYS);

        String accessToken = createJwt(user, issuedAt, accessExpiresAt, accessSecret, "access", UUID.randomUUID().toString());
        String refreshToken = createJwt(user, issuedAt, refreshExpiresAt, refreshSecret, "refresh", UUID.randomUUID().toString());

        userSessionMapper.insertSession(new UserSession(
            null,
            user.id(),
            sha256(refreshToken),
            refreshExpiresAt,
            null
        ));

        return new IssuedTokenPair(accessToken, refreshToken, accessTtlMinutes * 60);
    }

    @Override
    public IssuedTokenPair refresh(String refreshToken) {
        RefreshTokenPayload payload = verifyRefreshToken(refreshToken);
        String refreshTokenHash = sha256(refreshToken);
        userSessionMapper.findActiveByHash(refreshTokenHash)
            .orElseThrow(() -> new InvalidRefreshTokenException("Refresh token is expired, revoked, or unknown."));

        UserAccount user = userAccountMapper.findById(payload.userId())
            .orElseThrow(() -> new InvalidRefreshTokenException("Refresh token user no longer exists."));

        userSessionMapper.revokeByHash(refreshTokenHash);
        return issueFor(user);
    }

    @Override
    public void revoke(String refreshToken) {
        verifyRefreshToken(refreshToken);
        int revoked = userSessionMapper.revokeByHash(sha256(refreshToken));
        if (revoked == 0) {
            throw new InvalidRefreshTokenException("Refresh token is expired, revoked, or unknown.");
        }
    }

    private String createJwt(
        UserAccount user,
        Instant issuedAt,
        Instant expiresAt,
        String secret,
        String tokenUse,
        String tokenId
    ) {
        String header = "{\"alg\":\"HS256\",\"typ\":\"JWT\"}";
        String payload = """
            {"sub":"%s","email":"%s","tokenUse":"%s","iat":%d,"exp":%d,"jti":"%s"}
            """.formatted(
            user.id(),
            escapeJson(user.email()),
            tokenUse,
            issuedAt.getEpochSecond(),
            expiresAt.getEpochSecond(),
            tokenId
        ).trim();

        String unsignedToken = base64Url(header.getBytes(StandardCharsets.UTF_8))
            + "."
            + base64Url(payload.getBytes(StandardCharsets.UTF_8));
        return unsignedToken + "." + hmacSha256(unsignedToken, secret);
    }

    private RefreshTokenPayload verifyRefreshToken(String refreshToken) {
        String[] parts = refreshToken.split("\\.");
        if (parts.length != 3) {
            throw new InvalidRefreshTokenException("Invalid refresh token.");
        }

        String unsignedToken = parts[0] + "." + parts[1];
        if (!hmacSha256(unsignedToken, refreshSecret).equals(parts[2])) {
            throw new InvalidRefreshTokenException("Invalid refresh token.");
        }

        Map<String, Object> payload = decodePayload(parts[1]);
        if (!"refresh".equals(payload.get("tokenUse"))) {
            throw new InvalidRefreshTokenException("Invalid refresh token.");
        }

        long expiresAt = ((Number) payload.get("exp")).longValue();
        if (Instant.ofEpochSecond(expiresAt).isBefore(clock.instant())) {
            throw new InvalidRefreshTokenException("Refresh token is expired.");
        }

        return new RefreshTokenPayload(Long.valueOf(String.valueOf(payload.get("sub"))));
    }

    private Map<String, Object> decodePayload(String encodedPayload) {
        try {
            byte[] payload = Base64.getUrlDecoder().decode(encodedPayload);
            return objectMapper.readValue(payload, PAYLOAD_TYPE);
        } catch (Exception exception) {
            throw new InvalidRefreshTokenException("Invalid refresh token.");
        }
    }

    private String hmacSha256(String value, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return base64Url(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to sign JWT.", exception);
        }
    }

    private String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(hashed.length * 2);
            for (byte item : hashed) {
                hex.append("%02x".formatted(item));
            }
            return hex.toString();
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to hash refresh token.", exception);
        }
    }

    private String base64Url(byte[] value) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(value);
    }

    private String escapeJson(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private record RefreshTokenPayload(Long userId) {
    }
}
