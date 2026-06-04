package com.ezone.backend.security;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class JwtAccessTokenVerifier {

    private static final TypeReference<Map<String, Object>> PAYLOAD_TYPE = new TypeReference<>() {
    };

    private final ObjectMapper objectMapper;
    private final String accessSecret;
    private final Clock clock;

    @Autowired
    public JwtAccessTokenVerifier(
        ObjectMapper objectMapper,
        @Value("${auth.jwt.access-secret}") String accessSecret
    ) {
        this(objectMapper, accessSecret, Clock.systemUTC());
    }

    JwtAccessTokenVerifier(ObjectMapper objectMapper, String accessSecret, Clock clock) {
        this.objectMapper = objectMapper;
        this.accessSecret = accessSecret;
        this.clock = clock;
    }

    public JwtAuthenticatedUser verify(String token) {
        String[] parts = token.split("\\.");
        if (parts.length != 3) {
            throw new IllegalArgumentException("Invalid JWT format");
        }

        String unsignedToken = parts[0] + "." + parts[1];
        if (!hmacSha256(unsignedToken, accessSecret).equals(parts[2])) {
            throw new IllegalArgumentException("Invalid JWT signature");
        }

        Map<String, Object> payload = decodePayload(parts[1]);
        if (!"access".equals(payload.get("tokenUse"))) {
            throw new IllegalArgumentException("JWT is not an access token");
        }

        long expiresAt = ((Number) payload.get("exp")).longValue();
        if (Instant.ofEpochSecond(expiresAt).isBefore(clock.instant())) {
            throw new IllegalArgumentException("JWT is expired");
        }

        return new JwtAuthenticatedUser(
            Long.valueOf(String.valueOf(payload.get("sub"))),
            String.valueOf(payload.get("email"))
        );
    }

    private Map<String, Object> decodePayload(String encodedPayload) {
        try {
            byte[] payload = Base64.getUrlDecoder().decode(encodedPayload);
            return objectMapper.readValue(payload, PAYLOAD_TYPE);
        } catch (Exception exception) {
            throw new IllegalArgumentException("Invalid JWT payload", exception);
        }
    }

    private String hmacSha256(String value, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return Base64.getUrlEncoder().withoutPadding()
                .encodeToString(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to verify JWT.", exception);
        }
    }
}
