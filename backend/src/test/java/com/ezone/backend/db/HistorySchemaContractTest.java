package com.ezone.backend.db;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

class HistorySchemaContractTest {

    @Test
    void historySchemaStoresResultStageSeparatelyFromActiveBasketStatus() throws IOException {
        String baseMigration = Files.readString(Path.of(
            "src/main/resources/db/migration/V24__add_application_history.sql"
        ));
        String relaxMigration = Files.readString(Path.of(
            "src/main/resources/db/migration/V27__relax_application_history_import_fields.sql"
        ));
        String workspaceMapper = Files.readString(Path.of(
            "src/main/resources/mapper/P1WorkspaceMapper.xml"
        ));

        assertThat(baseMigration).contains("CREATE TABLE IF NOT EXISTS application_history");
        assertThat(baseMigration).contains("result_stage");
        assertThat(baseMigration).contains("raw_result");
        assertThat(baseMigration).contains("workspace_id");
        assertThat(baseMigration).contains("idx_application_history_user_period");
        assertThat(workspaceMapper).contains("upsertApplicationHistoryFromBasketJob");
        assertThat(workspaceMapper).contains("ON DUPLICATE KEY UPDATE");
        assertThat(workspaceMapper).contains("bj.deleted_at IS NULL");
        assertThat(workspaceMapper).contains("application_history ah");
        assertThat(relaxMigration).contains("period_year INT NULL");
        assertThat(baseMigration + relaxMigration).doesNotContain("@gmail.com");
    }
}
