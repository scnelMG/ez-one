package com.ezone.backend.db;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;

class FlywayMigrationVersionContractTest {

    private static final Pattern VERSIONED_MIGRATION = Pattern.compile("^V([^_]+)__.+\\.sql$");

    @Test
    void flywayMigrationVersionsAreUnique() throws IOException {
        Map<String, String> firstFileByVersion = new HashMap<>();
        List<String> duplicates = Files.list(Path.of("src/main/resources/db/migration"))
            .map(path -> path.getFileName().toString())
            .map(FlywayMigrationVersionContractTest::versionedMigration)
            .filter(MigrationFile::versioned)
            .filter(migration -> {
                String existingFile = firstFileByVersion.putIfAbsent(migration.version(), migration.fileName());
                return existingFile != null;
            })
            .map(migration -> migration.version() + " -> " + firstFileByVersion.get(migration.version()) + ", " + migration.fileName())
            .sorted()
            .toList();

        assertThat(duplicates).as("Flyway rejects duplicate versioned migration numbers").isEmpty();
    }

    private static MigrationFile versionedMigration(String fileName) {
        Matcher matcher = VERSIONED_MIGRATION.matcher(fileName);
        if (!matcher.matches()) {
            return new MigrationFile(fileName, "", false);
        }
        return new MigrationFile(fileName, matcher.group(1), true);
    }

    private record MigrationFile(String fileName, String version, boolean versioned) {
    }
}
