package com.ezone.backend.scheduler;

import com.ezone.backend.service.CompanyDataSyncService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class CompanyDataScheduler {

    private static final Logger log = LoggerFactory.getLogger(CompanyDataScheduler.class);

    private final CompanyDataSyncService syncService;

    public CompanyDataScheduler(CompanyDataSyncService syncService) {
        this.syncService = syncService;
    }

    @Scheduled(cron = "0 0 2 * * ?") // 매일 새벽 2시
    public void syncCompanyDataBatch() {
        log.info("Starting nightly company data sync from National Pension API.");
        
        String[] sampleCompaniesToUpdate = {"비바리퍼블리카", "당근마켓", "우아한형제들"};
        
        for (String companyName : sampleCompaniesToUpdate) {
            try {
                syncService.syncCompanyByName(companyName);
                Thread.sleep(500);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                log.error("Sync interrupted.", e);
                break;
            } catch (Exception e) {
                log.error("Failed to sync company: {}", companyName, e);
            }
        }
        
        log.info("Finished nightly company data sync.");
    }
}
