package com.ezone.backend.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import com.ezone.backend.domain.UserAccount;
import com.ezone.backend.dto.auth.GoogleUserProfile;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mybatis.spring.boot.test.autoconfigure.MybatisTest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.jdbc.core.JdbcTemplate;

@MybatisTest(
    properties = {
        "spring.datasource.url=jdbc:h2:mem:user-account-mapper;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.flyway.enabled=false",
        "spring.sql.init.mode=never"
    }
)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class UserAccountMapperIntegrationTest {

    private static final String TEST_GOOGLE_SUBJECT = "test-google-subject-auth-001";

    @Autowired
    private UserAccountMapper userAccountMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void setUp() {
        jdbcTemplate.execute("DROP TABLE IF EXISTS users");
        jdbcTemplate.execute("""
            CREATE TABLE users (
              id BIGINT PRIMARY KEY AUTO_INCREMENT,
              email VARCHAR(255) NOT NULL,
              name VARCHAR(255) NOT NULL,
              nickname VARCHAR(255) NOT NULL,
              provider VARCHAR(32) NOT NULL,
              provider_id VARCHAR(255) NOT NULL,
              password_hash VARCHAR(255) NULL,
              profile_completed BOOLEAN NOT NULL DEFAULT FALSE,
              created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
              deleted_at TIMESTAMP NULL,
              UNIQUE KEY uk_users_email (email),
              UNIQUE KEY uk_users_provider_subject (provider, provider_id)
            )
            """);
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

    @Test
    void withdrawUserAnonymizesAccountAndExcludesItFromLookups() {
        GoogleUserProfile profile = new GoogleUserProfile(
            "withdraw-google-subject",
            "withdraw-user@example.com",
            "Withdraw User",
            "Withdraw"
        );

        UserAccount created = userAccountMapper.createFromGoogleProfile(profile);
        int updated = userAccountMapper.withdrawUser(created.id());

        assertThat(updated).isEqualTo(1);
        assertThat(userAccountMapper.findByGoogleSubject("withdraw-google-subject")).isEmpty();
        assertThat(userAccountMapper.findByEmail("withdraw-user@example.com")).isEmpty();
        assertThat(jdbcTemplate.queryForObject(
            "SELECT deleted_at IS NOT NULL FROM users WHERE id = ?",
            Boolean.class,
            created.id()
        )).isTrue();
    }
}
