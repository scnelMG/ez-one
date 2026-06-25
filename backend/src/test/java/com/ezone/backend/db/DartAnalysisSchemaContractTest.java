package com.ezone.backend.db;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

class DartAnalysisSchemaContractTest {

    @Test
    void dartAnalysisSchemaPersistsPreviewResultsForRestartSafeSaveReference() throws IOException {
        String migration = Files.readString(Path.of(
            "src/main/resources/db/migration/V42__persist_dart_analyses.sql"
        ));
        String schema = Files.readString(Path.of("src/main/resources/schema-mysql.sql"));

        assertThat(migration).contains("CREATE TABLE IF NOT EXISTS dart_analyses");
        assertThat(migration).contains("user_id BIGINT NOT NULL");
        assertThat(migration).contains("workspace_id BIGINT NOT NULL");
        assertThat(migration).contains("result_json LONGTEXT NOT NULL");
        assertThat(migration).contains("idx_dart_analyses_user_workspace");
        assertThat(migration).contains("fk_dart_analyses_workspace");
        assertThat(schema).contains("CREATE TABLE IF NOT EXISTS dart_analyses");
    }
}
