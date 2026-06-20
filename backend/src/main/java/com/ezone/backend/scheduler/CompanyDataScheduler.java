package com.ezone.backend.scheduler;

import com.ezone.backend.mapper.CompanySyncMapper;
import com.ezone.backend.service.CompanyDataSyncService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class CompanyDataScheduler {

    private static final Logger log = LoggerFactory.getLogger(CompanyDataScheduler.class);

    private final CompanyDataSyncService syncService;
    private final CompanySyncMapper syncMapper;

    public CompanyDataScheduler(CompanyDataSyncService syncService, CompanySyncMapper syncMapper) {
        this.syncService = syncService;
        this.syncMapper = syncMapper;
    }

    @Scheduled(cron = "0 0 2 * * ?") // 매일 새벽 2시
    public void syncCompanyDataBatch() {
        log.info("Starting nightly company data sync from National Pension API.");
        
        int limit = 500; // API limits ~10,000, but we sync 500 empty ones per night for safety
        List<String> companiesToUpdate = syncMapper.findCompaniesNeedingPensionSync(limit);
        log.info("Found {} companies needing pension sync.", companiesToUpdate.size());
        
        for (String companyName : companiesToUpdate) {
            try {
                syncService.syncCompanyByName(companyName);
                Thread.sleep(500); // 0.5초 대기
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
