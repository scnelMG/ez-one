package com.ezone.backend.db;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;
import org.junit.jupiter.api.Test;

class P1SchemaTimestampContractTest {

    private static final List<String> MUTABLE_P1_TABLES = List.of(
        "users",
        "companies",
        "company_info_sources",
        "company_profiles",
        "company_profile_sources",
        "company_financial_snapshots",
        "company_raw_documents",
        "jobs",
        "basket_jobs",
        "workspaces",
        "essay_questions",
        "essay_drafts",
        "reference_materials",
        "document_profile_sections",
        "document_custom_fields"
    );

    @Test
    void mutableP1TablesStoreCreatedAndUpdatedTimestamps() throws IOException {
        String schema = readResource("/schema-mysql.sql").toLowerCase(Locale.ROOT);

        for (String table : MUTABLE_P1_TABLES) {
            String tableDefinition = tableDefinition(schema, table);
            assertThat(tableDefinition)
                .as(table + " table must exist")
                .isNotBlank();
            assertThat(tableDefinition)
                .as(table + " must store created_at for COMMON-005")
                .contains("created_at");
            assertThat(tableDefinition)
                .as(table + " must store updated_at for COMMON-005")
                .contains("updated_at");
        }
    }

    private String readResource(String resourcePath) throws IOException {
        try (var inputStream = getClass().getResourceAsStream(resourcePath)) {
            assertThat(inputStream).as(resourcePath + " resource must exist").isNotNull();
            return new String(inputStream.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    private String tableDefinition(String schema, String table) {
        String marker = "create table if not exists " + table;
        int start = schema.indexOf(marker);
        if (start < 0) {
            return "";
        }

        int nextTable = schema.indexOf("create table if not exists ", start + marker.length());
        if (nextTable < 0) {
            return schema.substring(start);
        }
        return schema.substring(start, nextTable);
    }
}
