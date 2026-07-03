package com.ezone.backend.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.ezone.backend.mapper.P1WorkspaceMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mybatis.spring.boot.test.autoconfigure.MybatisTest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.jdbc.core.JdbcTemplate;

@MybatisTest(
    properties = {
        "spring.datasource.url=jdbc:h2:mem:p1-workspace-domain-replacement;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "mybatis.mapper-locations=classpath:mapper/*.xml",
        "spring.flyway.enabled=false",
        "spring.sql.init.mode=never"
    }
)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class P1WorkspaceDomainReplacementTest {

    @Autowired
    private P1WorkspaceMapper mapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void setUp() {
        jdbcTemplate.execute("DROP TABLE IF EXISTS companies");
        jdbcTemplate.execute("""
            CREATE TABLE companies (
              id BIGINT PRIMARY KEY AUTO_INCREMENT,
              name VARCHAR(255) NOT NULL,
              domain VARCHAR(255) NULL,
              company_type VARCHAR(64) NULL,
              size VARCHAR(64) NULL,
              updated_at TIMESTAMP NULL
            )
            """);
    }

    @Test
    void updateCompanyClassificationReplacesJobBoardAndRecruiterDomainsWhenOfficialDomainExists() {
        Long jasoseolCompanyId = insertCompany("Jasoseol Placeholder", "jasoseol.com");
        Long recruiterCompanyId = insertCompany("DB Inc", "dbgroup.recruiter.co.kr");

        mapper.updateCompanyClassification(jasoseolCompanyId, "dbinc.co.kr", "대기업", "대기업");
        mapper.updateCompanyClassification(recruiterCompanyId, "dbinc.co.kr", "대기업", "대기업");

        assertThat(domainOf(jasoseolCompanyId)).isEqualTo("dbinc.co.kr");
        assertThat(domainOf(recruiterCompanyId)).isEqualTo("dbinc.co.kr");
    }

    @Test
    void updateCompanyClassificationPreservesRealExistingDomainWhenProviderDomainIsBlankOrUnknown() {
        Long companyId = insertCompany("Real Company", "example.com");

        mapper.updateCompanyClassification(companyId, null, "대기업", "대기업");
        mapper.updateCompanyClassification(companyId, "", "대기업", "대기업");

        assertThat(domainOf(companyId)).isEqualTo("example.com");
    }

    @Test
    void updateCompanyClassificationPreservesRealExistingDomainWhenOfficialDomainDiffers() {
        Long companyId = insertCompany("Real Company", "example.com");

        mapper.updateCompanyClassification(companyId, "official.example.com", "대기업", "대기업");

        assertThat(domainOf(companyId)).isEqualTo("example.com");
    }

    private Long insertCompany(String name, String domain) {
        jdbcTemplate.update(
            "INSERT INTO companies (name, domain, company_type, size) VALUES (?, ?, ?, ?)",
            name,
            domain,
            "미확인",
            "미확인"
        );
        return jdbcTemplate.queryForObject("SELECT MAX(id) FROM companies", Long.class);
    }

    private String domainOf(Long companyId) {
        return jdbcTemplate.queryForObject(
            "SELECT domain FROM companies WHERE id = ?",
            String.class,
            companyId
        );
    }
}
