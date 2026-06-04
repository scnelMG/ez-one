package com.ezone.backend.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import com.ezone.backend.domain.UserAccount;
import com.ezone.backend.dto.auth.GoogleUserProfile;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@EnabledIfEnvironmentVariable(named = "RUN_DB_INTEGRATION_TESTS", matches = "true")
class UserAccountMapperIntegrationTest {

    private static final String TEST_GOOGLE_SUBJECT = "test-google-subject-auth-001";

    @Autowired
    private UserAccountMapper userAccountMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void setUp() {
        ensureColumn("name", "VARCHAR(255) NOT NULL DEFAULT ''");
        ensureColumn("nickname", "VARCHAR(255) NOT NULL DEFAULT ''");
        ensureColumn("profile_completed", "BOOLEAN NOT NULL DEFAULT FALSE");
        jdbcTemplate.update("UPDATE users SET name = email WHERE name = ''");
        jdbcTemplate.update("UPDATE users SET nickname = email WHERE nickname = ''");
        jdbcTemplate.update("DELETE FROM users WHERE provider = 'GOOGLE' AND provider_id = ?", TEST_GOOGLE_SUBJECT);
    }

    @Test
    void createFromGoogleProfilePersistsGoogleAccountInformation() {
        GoogleUserProfile profile = new GoogleUserProfile(
            TEST_GOOGLE_SUBJECT,
            "auth001-user@example.com",
            "Hong Gil Dong",
            "Gil Dong"
        );

        UserAccount created = userAccountMapper.createFromGoogleProfile(profile);
        Optional<UserAccount> loaded = userAccountMapper.findByGoogleSubject(TEST_GOOGLE_SUBJECT);

        assertThat(created.email()).isEqualTo("auth001-user@example.com");
        assertThat(created.name()).isEqualTo("Hong Gil Dong");
        assertThat(created.nickname()).isEqualTo("Gil Dong");
        assertThat(created.profileCompleted()).isFalse();
        assertThat(loaded).hasValueSatisfying(user -> {
            assertThat(user.email()).isEqualTo("auth001-user@example.com");
            assertThat(user.name()).isEqualTo("Hong Gil Dong");
            assertThat(user.nickname()).isEqualTo("Gil Dong");
            assertThat(user.profileCompleted()).isFalse();
        });
    }

    private void ensureColumn(String columnName, String definition) {
        Integer count = jdbcTemplate.queryForObject("""
            SELECT COUNT(*)
            FROM information_schema.columns
            WHERE table_schema = DATABASE()
              AND table_name = 'users'
              AND column_name = ?
            """, Integer.class, columnName);

        if (count == null || count == 0) {
            jdbcTemplate.execute("ALTER TABLE users ADD COLUMN " + columnName + " " + definition);
        }
    }
}
