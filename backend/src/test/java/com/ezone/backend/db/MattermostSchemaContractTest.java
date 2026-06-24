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
        assertThat(schema).contains("posted_at timestamp null");
        assertThat(schema).contains("unique key uk_mm_messages_message_id (message_id)");
        assertThat(schema).contains("key idx_mm_messages_channel_posted (channel_id, posted_at)");
        assertThat(schema).contains("create table if not exists mm_parsed_job_posts");
        assertThat(schema).contains("deadline_type varchar(32) null");
        assertThat(schema).contains("deadline_date date null");
        assertThat(schema).contains("normalized_deadline_label varchar(64) null");
        assertThat(schema).contains("constraint fk_mm_parsed_job_posts_message");
        assertThat(schema).contains("promoted_job_id bigint null");
        assertThat(schema).contains("create table if not exists mm_recommendation_scores");
        assertThat(schema).contains("status varchar(32) not null default 'pending'");
        assertThat(schema).contains("unique key uk_mm_recommendation_scores_user_candidate");
    }

    @Test
    void migrationCreatesMattermostTables() throws IOException {
        String migration = readResource("/db/migration/V23__add_mattermost_collection_tables.sql").toLowerCase();
        assertThat(migration).contains("create table if not exists mm_messages");
        assertThat(migration).contains("create table if not exists mm_parsed_job_posts");
        assertThat(migration).contains("review_status varchar(64) not null default 'needs_review'");
    }

    @Test
    void migrationAddsStoredMattermostRecommendationScoring() throws IOException {
        String migration = readResource("/db/migration/V34__add_mattermost_scoring_and_deadlines.sql").toLowerCase();
        assertThat(migration).contains("alter table mm_parsed_job_posts");
        assertThat(migration).contains("add column deadline_type varchar(32) null");
        assertThat(migration).contains("information_schema.columns");
        assertThat(migration).contains("column_name = 'deadline_type'");
        assertThat(migration).contains("column_name = 'deadline_date'");
        assertThat(migration).contains("column_name = 'normalized_deadline_label'");
        assertThat(migration).contains("create table if not exists mm_recommendation_scores");
        assertThat(migration).contains("unique key uk_mm_recommendation_scores_user_candidate");
        assertThat(migration).contains("status varchar(32) not null default 'pending'");
    }

    @Test
    void migrationAddsMattermostOriginalPostedAt() throws IOException {
        String migration = readResource("/db/migration/V33__add_mattermost_posted_at.sql").toLowerCase();
        assertThat(migration).contains("alter table mm_messages");
        assertThat(migration).contains("add column posted_at timestamp null");
        assertThat(migration).contains("information_schema.columns");
        assertThat(migration).contains("information_schema.statistics");
        assertThat(migration).contains("column_name = 'posted_at'");
        assertThat(migration).contains("idx_mm_messages_channel_posted");
    }

    private String readResource(String resourcePath) throws IOException {
        try (var inputStream = getClass().getResourceAsStream(resourcePath)) {
            assertThat(inputStream).as(resourcePath + " resource must exist").isNotNull();
            return new String(inputStream.readAllBytes(), StandardCharsets.UTF_8);
        }
    }
}
