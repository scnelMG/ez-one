package com.ezone.backend.db;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import org.junit.jupiter.api.Test;

class P1CompanyInfoSourceContractTest {

    @Test
    void schemaStoresCompanyInfoSourceStatusForPolicyConstrainedP1Collection() throws IOException {
        String schema = readResource("/schema-mysql.sql").toLowerCase(Locale.ROOT);

        assertThat(schema).contains("create table if not exists company_info_sources");
        assertThat(schema).contains("company_id bigint not null");
        assertThat(schema).contains("source_url varchar(1024) not null");
        assertThat(schema).contains("status varchar(32) not null");
    }

    @Test
    void mapperCanRecordSavedJobUrlAsUnverifiedCompanyInfoSource() throws IOException {
        String mapperXml = readResource("/mapper/P1WorkspaceMapper.xml");

        assertThat(mapperXml).contains("<insert id=\"recordCompanyInfoSource\"");
        assertThat(mapperXml).contains("company_info_sources");
        assertThat(mapperXml).contains("ON DUPLICATE KEY UPDATE");
    }

    private String readResource(String resourcePath) throws IOException {
        try (var inputStream = getClass().getResourceAsStream(resourcePath)) {
            assertThat(inputStream).as(resourcePath + " resource must exist").isNotNull();
            return new String(inputStream.readAllBytes(), StandardCharsets.UTF_8);
        }
    }
}
