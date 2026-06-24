package com.ezone.backend.config;

import com.ezone.backend.service.CompanyDataSyncService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(prefix = "company-data.startup-sync", name = "enabled", havingValue = "true")
public class StartupSyncRunner implements CommandLineRunner {
    private static final Logger log = LoggerFactory.getLogger(StartupSyncRunner.class);

    private final CompanyDataSyncService syncService;

    public StartupSyncRunner(CompanyDataSyncService syncService) {
        this.syncService = syncService;
    }

    @Override
    public void run(String... args) {
        log.info("Starting optional startup company data sync in background.");
        new Thread(() -> {
            try {
                syncService.runDailyPensionSync();
                log.info("Finished optional startup company data sync.");
            } catch (Exception e) {
                log.error("Startup company data sync failed.", e);
            }
        }, "company-data-startup-sync").start();
    }
}
