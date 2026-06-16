package com.ezone.backend.db;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

class MattermostSchemaContractTest {

    @Test
    void schemaDefinesMattermostRawAndCandidateTables() throws IOException {
        String schema = readResource("/schema-mysql.sql").toLowerCase();
        assertThat(schema).contains("create table if not exists mm_messages");
        assertThat(schema).contains("unique key uk_mm_messages_message_id (message_id)");
        assertThat(schema).contains("create table if not exists mm_parsed_job_posts");
        assertThat(schema).contains("constraint fk_mm_parsed_job_posts_message");
        assertThat(schema).contains("promoted_job_id bigint null");
    }

    @Test
    void migrationCreatesMattermostTables() throws IOException {
        String migration = readResource("/db/migration/V23__add_mattermost_collection_tables.sql").toLowerCase();
        assertThat(migration).contains("create table if not exists mm_messages");
        assertThat(migration).contains("create table if not exists mm_parsed_job_posts");
        assertThat(migration).contains("review_status varchar(64) not null default 'needs_review'");
    }

    private String readResource(String resourcePath) throws IOException {
        try (var inputStream = getClass().getResourceAsStream(resourcePath)) {
            assertThat(inputStream).as(resourcePath + " resource must exist").isNotNull();
            return new String(inputStream.readAllBytes(), StandardCharsets.UTF_8);
        }
    }
}
