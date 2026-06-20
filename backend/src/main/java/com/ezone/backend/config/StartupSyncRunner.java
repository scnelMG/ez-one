package com.ezone.backend.config;

import com.ezone.backend.service.CompanyDataSyncService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class StartupSyncRunner implements CommandLineRunner {
    private final CompanyDataSyncService syncService;

    public StartupSyncRunner(CompanyDataSyncService syncService) {
        this.syncService = syncService;
    }

    @Override
    public void run(String... args) {
        System.out.println("====== FORCING IMMEDIATE SYNC OF 1000 COMPANIES IN BACKGROUND ======");
        new Thread(() -> {
            try {
                syncService.runDailyPensionSync();
                System.out.println("====== FINISHED SYNC OF 1000 COMPANIES ======");
            } catch (Exception e) {
                e.printStackTrace();
            }
        }).start();
    }
}
