package com.ezone.backend.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import com.ezone.backend.service.CompanyDataSyncService;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

class StartupSyncRunnerTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
        .withBean(CompanyDataSyncService.class, () -> mock(CompanyDataSyncService.class))
        .withUserConfiguration(StartupSyncRunner.class);

    @Test
    void startupCompanyDataSyncIsDisabledByDefault() {
        contextRunner.run(context ->
            assertThat(context).doesNotHaveBean(StartupSyncRunner.class)
        );
    }

    @Test
    void startupCompanyDataSyncCanBeEnabledExplicitly() {
        contextRunner
            .withPropertyValues("company-data.startup-sync.enabled=true")
            .run(context -> assertThat(context).hasSingleBean(StartupSyncRunner.class));
    }
}
