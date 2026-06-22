package com.ezone.backend.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import com.ezone.backend.domain.UserSession;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mybatis.spring.boot.test.autoconfigure.MybatisTest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.jdbc.core.JdbcTemplate;

@MybatisTest(
    properties = {
        "spring.datasource.url=jdbc:h2:mem:user-session-mapper;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.flyway.enabled=false",
        "spring.sql.init.mode=never"
    }
)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class UserSessionMapperIntegrationTest {

    @Autowired
    private UserSessionMapper userSessionMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void setUp() {
        jdbcTemplate.execute("DROP TABLE IF EXISTS user_sessions");
        jdbcTemplate.execute("""
            CREATE TABLE user_sessions (
              id BIGINT PRIMARY KEY AUTO_INCREMENT,
              user_id BIGINT NOT NULL,
              refresh_token_hash VARCHAR(255) NOT NULL,
              expires_at TIMESTAMP NOT NULL,
              revoked_at TIMESTAMP NULL,
              created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """);
    }

    @Test
    void findActiveByHashMapsImmutableUserSessionRecord() {
        String refreshTokenHash = "refresh-token-hash";
        userSessionMapper.insertSession(new UserSession(
            null,
            42L,
            refreshTokenHash,
            Instant.parse("2026-07-01T00:00:00Z"),
            null
        ));

        Optional<UserSession> loaded = userSessionMapper.findActiveByHash(refreshTokenHash);

        assertThat(loaded).hasValueSatisfying(session -> {
            assertThat(session.id()).isNotNull();
            assertThat(session.userId()).isEqualTo(42L);
            assertThat(session.refreshTokenHash()).isEqualTo(refreshTokenHash);
            assertThat(session.revokedAt()).isNull();
        });
    }
}
