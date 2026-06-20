package com.ezone.backend;

import com.ezone.backend.service.CompanyDataSyncService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class ManualSyncTest {

    @Autowired
    private CompanyDataSyncService syncService;

    @Test
    void syncSpecificCompanies() {
        System.out.println("--- SYNCING KAKAO ---");
        syncService.syncCompanyByName("카카오");
        System.out.println("--- SYNCING WOOWA ---");
        syncService.syncCompanyByName("우아한형제들");
    }
}
