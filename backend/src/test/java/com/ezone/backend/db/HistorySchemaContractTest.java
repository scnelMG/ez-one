package com.ezone.backend.db;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

class HistorySchemaContractTest {

    @Test
    void historySchemaStoresResultStageSeparatelyFromActiveBasketStatus() throws IOException {
        String migration = Files.readString(Path.of(
            "src/main/resources/db/migration/V24__add_application_history.sql"
        ));

        assertThat(migration).contains("CREATE TABLE IF NOT EXISTS application_history");
        assertThat(migration).contains("result_stage");
        assertThat(migration).contains("raw_result");
        assertThat(migration).contains("workspace_id");
        assertThat(migration).contains("idx_application_history_user_period");
        assertThat(migration).doesNotContain("@gmail.com");
    }
}
