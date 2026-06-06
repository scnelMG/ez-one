package com.ezone.backend.db;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import org.junit.jupiter.api.Test;

class P1CompanyLogoContractTest {

    @Test
    void schemaStoresReusableCompanyLogoMetadataOnCompanies() throws IOException {
        String schema = readResource("/schema-mysql.sql").toLowerCase(Locale.ROOT);

        assertThat(schema).contains("domain varchar(255) not null");
        assertThat(schema).contains("logo_url varchar(1024) null");
        assertThat(schema).contains("logo_source_url varchar(1024) null");
        assertThat(schema).contains("logo_status varchar(32) null");
        assertThat(schema).contains("logo_updated_at timestamp null");
        assertThat(schema).contains("unique key uk_companies_name_domain (name, domain)");
    }

    @Test
    void migrationBackfillsDomainBeforeAddingCompanyNameDomainUniqueKey() throws IOException {
        String migration = readResource("/db/migration/V7__add_company_logo_fields.sql").toLowerCase(Locale.ROOT);

        assertThat(migration).contains("update companies");
        assertThat(migration).contains("set domain = 'unknown'");
        assertThat(migration).contains("modify column domain varchar(255) not null");
        assertThat(migration).contains("add unique key uk_companies_name_domain (name, domain)");
    }

    @Test
    void followUpMigrationRepairsLocalDatabasesWithNullableCompanyDomain() throws IOException {
        String migration = readResource("/db/migration/V8__backfill_company_domain_not_null.sql")
            .toLowerCase(Locale.ROOT);

        assertThat(migration).contains("update companies");
        assertThat(migration).contains("set domain = 'unknown'");
        assertThat(migration).contains("modify column domain varchar(255) not null");
    }

    @Test
    void mapperOnlySetsLogoUpdatedAtWhenLogoCandidateExists() throws IOException {
        String mapperXml = readResource("/mapper/P1WorkspaceMapper.xml");

        assertThat(mapperXml).contains("CASE WHEN #{companyLogoUrl} IS NULL THEN NULL ELSE CURRENT_TIMESTAMP END");
        assertThat(mapperXml).contains("logo_url = IF(logo_url IS NULL, VALUES(logo_url), logo_url)");
    }

    private String readResource(String resourcePath) throws IOException {
        try (var inputStream = getClass().getResourceAsStream(resourcePath)) {
            assertThat(inputStream).as(resourcePath + " resource must exist").isNotNull();
            return new String(inputStream.readAllBytes(), StandardCharsets.UTF_8);
        }
    }
}
