package com.ezone.backend.scheduler;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import com.ezone.backend.mapper.CompanySyncMapper;
import com.ezone.backend.service.CompanyDataSyncService;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

class CompanyDataSchedulerTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
        .withBean(CompanyDataSyncService.class, () -> mock(CompanyDataSyncService.class))
        .withBean(CompanySyncMapper.class, () -> mock(CompanySyncMapper.class))
        .withUserConfiguration(CompanyDataScheduler.class);

    @Test
    void scheduledCompanyDataBatchSyncIsDisabledByDefault() {
        contextRunner.run(context ->
            assertThat(context).doesNotHaveBean(CompanyDataScheduler.class)
        );
    }

    @Test
    void scheduledCompanyDataBatchSyncCanBeEnabledExplicitly() {
        contextRunner
            .withPropertyValues("company-data.batch-sync.enabled=true")
            .run(context -> assertThat(context).hasSingleBean(CompanyDataScheduler.class));
    }
}
