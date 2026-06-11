package com.ezone.backend.db;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import org.junit.jupiter.api.Test;

class CompanyProfileDataFoundationContractTest {

    @Test
    void schemaStoresCompanyProfilesSourcesFinancialsAndRawDocuments() throws IOException {
        String schema = readResource("/schema-mysql.sql").toLowerCase(Locale.ROOT);

        assertThat(schema).contains("create table if not exists company_profiles");
        assertThat(schema).contains("unique key uk_company_profiles_company (company_id)");
        assertThat(schema).contains("corp_code varchar(20) null");
        assertThat(schema).contains("profile_summary text null");

        assertThat(schema).contains("create table if not exists company_profile_sources");
        assertThat(schema).contains("license_note text null");
        assertThat(schema).contains("unique key uk_company_profile_sources_url (company_id, source_type, source_url_hash)");

        assertThat(schema).contains("create table if not exists company_financial_snapshots");
        assertThat(schema).contains("unique key uk_company_financial_snapshots_period (company_id, fiscal_year, statement_type)");

        assertThat(schema).contains("create table if not exists company_raw_documents");
        assertThat(schema).contains("payload_json json null");
        assertThat(schema).contains("payload_text mediumtext null");
    }

    @Test
    void flywayMigrationCreatesCompanyDataFoundationTables() throws IOException {
        String migration = readResource("/db/migration/V19__add_company_profile_data_foundation.sql")
            .toLowerCase(Locale.ROOT);

        assertThat(migration).contains("create table if not exists company_profiles");
        assertThat(migration).contains("create table if not exists company_profile_sources");
        assertThat(migration).contains("create table if not exists company_financial_snapshots");
        assertThat(migration).contains("create table if not exists company_raw_documents");
        assertThat(migration).contains("on delete cascade");
    }

    private String readResource(String resourcePath) throws IOException {
        try (var inputStream = getClass().getResourceAsStream(resourcePath)) {
            assertThat(inputStream).as(resourcePath + " resource must exist").isNotNull();
            return new String(inputStream.readAllBytes(), StandardCharsets.UTF_8);
        }
    }
}
