package com.ezone.backend.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import com.ezone.backend.domain.persistence.DartAnalysisRow;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mybatis.spring.boot.test.autoconfigure.MybatisTest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.jdbc.core.JdbcTemplate;

@MybatisTest(
    properties = {
        "spring.datasource.url=jdbc:h2:mem:dart-analysis-mapper;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.flyway.enabled=false",
        "spring.sql.init.mode=never"
    }
)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class DartAnalysisMapperIntegrationTest {

    @Autowired
    private DartAnalysisMapper dartAnalysisMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void setUp() {
        jdbcTemplate.execute("DROP TABLE IF EXISTS dart_analyses");
        jdbcTemplate.execute("""
            CREATE TABLE dart_analyses (
              id BIGINT PRIMARY KEY AUTO_INCREMENT,
              user_id BIGINT NOT NULL,
              workspace_id BIGINT NOT NULL,
              rcept_no VARCHAR(64) NOT NULL,
              report_name VARCHAR(255) NOT NULL,
              company_name VARCHAR(255) NOT NULL,
              status VARCHAR(32) NOT NULL,
              model VARCHAR(100),
              source_url VARCHAR(500),
              result_json LONGTEXT NOT NULL,
              error_message TEXT,
              created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """);
    }

    @Test
    void insertAndFindByIdRoundTripsDartAnalysisPreview() {
        DartAnalysisRow row = new DartAnalysisRow();
        row.setUserId(1L);
        row.setWorkspaceId(102L);
        row.setRceptNo("20260330000123");
        row.setReportName("사업보고서");
        row.setCompanyName("Kakao");
        row.setStatus("COMPLETED");
        row.setModel("gpt-4.1");
        row.setSourceUrl("https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260330000123");
        row.setResultJson("{\"appealPoints\":[\"Use platform reliability.\"]}");

        int inserted = dartAnalysisMapper.insert(row);
        DartAnalysisRow loaded = dartAnalysisMapper.findById(row.getId());

        assertThat(inserted).isEqualTo(1);
        assertThat(row.getId()).isNotNull();
        assertThat(loaded.getUserId()).isEqualTo(1L);
        assertThat(loaded.getWorkspaceId()).isEqualTo(102L);
        assertThat(loaded.getRceptNo()).isEqualTo("20260330000123");
        assertThat(loaded.getResultJson()).contains("Use platform reliability.");
    }
}
