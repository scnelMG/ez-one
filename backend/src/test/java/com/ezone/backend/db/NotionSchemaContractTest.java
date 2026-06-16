package com.ezone.backend.db;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

class NotionSchemaContractTest {

    @Test
    void notionSchemaStoresConnectionsSettingsLogsAndIdempotentJobSyncRecords() throws IOException {
        String migration = Files.readString(Path.of(
            "src/main/resources/db/migration/V29__add_notion_sync_tables.sql"
        ));

        assertThat(migration).contains("CREATE TABLE IF NOT EXISTS notion_connections");
        assertThat(migration).contains("access_token_ciphertext");
        assertThat(migration).contains("database_id");
        assertThat(migration).contains("CREATE TABLE IF NOT EXISTS notion_sync_settings");
        assertThat(migration).contains("sync_scope VARCHAR(64) NOT NULL DEFAULT 'JOB_ONLY'");
        assertThat(migration).contains("CREATE TABLE IF NOT EXISTS sync_logs");
        assertThat(migration).contains("basket_job_id BIGINT NULL");
        assertThat(migration).contains("notion_page_id VARCHAR(128) NULL");
        assertThat(migration).contains("CREATE TABLE IF NOT EXISTS notion_job_sync_records");
        assertThat(migration).contains("basket_job_id BIGINT PRIMARY KEY");
        assertThat(migration).doesNotContain("access_token VARCHAR");
    }
}
