package com.ezone.backend.service;

import com.ezone.backend.infrastructure.api.DartApiClient;
import com.ezone.backend.infrastructure.api.NationalPensionApiClient;
import com.ezone.backend.mapper.CompanySyncMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class CompanyDataSyncService {

    private static final Logger log = LoggerFactory.getLogger(CompanyDataSyncService.class);

    private final NationalPensionApiClient pensionApiClient;
    private final DartApiClient dartApiClient;
    private final CompanySyncMapper syncMapper;

    private static final String SOURCE_TYPE_PUBLIC_PENSION = "PUBLIC_PENSION";
    private static final String SOURCE_TYPE_DART = "DART";
    private static final String SOURCE_NAME_PENSION = "국민연금공단 사업장 내역";
    private static final String SOURCE_URL_PENSION = "https://www.data.go.kr/data/15083277/openapi.do";

    public CompanyDataSyncService(NationalPensionApiClient pensionApiClient, DartApiClient dartApiClient, CompanySyncMapper syncMapper) {
        this.pensionApiClient = pensionApiClient;
        this.dartApiClient = dartApiClient;
        this.syncMapper = syncMapper;
    }

    @Scheduled(cron = "0 0 12 * * ?") // 매일 낮 12시에 실행 (사용자 요청)
    public void runDailyPensionSync() {
        int limit = 1000;
        List<String> companiesToSync = syncMapper.findCompaniesNeedingPensionSync(limit);
        log.info("Starting daily Pension API sync for {} companies.", companiesToSync.size());
        
        for (String companyName : companiesToSync) {
            try {
                syncCompanyByName(companyName);
                Thread.sleep(200); // API Rate Limit 방지를 위한 지연 (0.2초)
            } catch (Exception e) {
                log.error("Failed daily sync for: {}", companyName, e);
            }
        }
        log.info("Finished daily Pension API sync.");
    }

    @Async
    public void syncCompanyDataAsync(String companyName) {
        try {
            syncCompanyByName(companyName);
        } catch (Exception e) {
            log.error("Failed to async sync company data for: {}", companyName, e);
        }
    }

    @Async
    public void syncCompanyDataAsync(Long companyId, String companyName) {
        try {
            syncCompanyByIdAndName(companyId, companyName);
        } catch (Exception e) {
            log.error("Failed to async sync company data for: {}", companyName, e);
        }
    }

    @Transactional
    public void syncCompanyByName(String companyName) {
        Long companyId = syncMapper.findCompanyIdByName(companyName);
        if (companyId != null) {
            syncCompanyByIdAndName(companyId, companyName);
        } else {
            log.warn("syncCompanyByName could not find company ID for: {}", companyName);
        }
    }

    @Transactional
    public void syncCompanyByIdAndName(Long companyId, String companyName) {
        if (companyId == null) {
            log.warn("syncCompanyByIdAndName called with null companyId for: {}", companyName);
            return;
        }

        // 1. 최적화: 우리 DB에 이미 프로필 정보가 있는지 먼저 확인합니다.
        Boolean hasData = syncMapper.hasCompleteProfile(companyId);
        if (hasData != null && hasData) {
            log.info("Company {} already has complete profile data in DB. Skipping API call to save rate limit.", companyName);
            return; // 이미 정보가 있으므로 API 호출 생략
        }

        log.info("Starting on-demand company sync from API for: {}", companyName);

        List<NationalPensionApiClient.CompanyPensionData> dataList = pensionApiClient.searchCompanyByName(companyName);
        if (dataList == null || dataList.isEmpty()) {
            log.info("No data found from National Pension API for: {}", companyName);
        }

        NationalPensionApiClient.CompanyPensionData pensionData = (dataList != null && !dataList.isEmpty()) ? dataList.get(0) : null;
        
        String address = pensionData != null ? pensionData.getAddress() : null;
        Integer employeeCount = pensionData != null ? pensionData.getEmployeeCount() : null;
        LocalDate foundedAt = null;

        if (pensionData != null && pensionData.getJoinDate() != null && pensionData.getJoinDate().length() == 8) {
            try {
                foundedAt = LocalDate.parse(pensionData.getJoinDate(), DateTimeFormatter.BASIC_ISO_DATE);
            } catch (Exception e) {
                log.warn("Failed to parse joinDate: {} for company: {}", pensionData.getJoinDate(), companyName);
            }
        }

        // --- DART API Sync ---
        String homepageUrl = null;
        String domain = syncMapper.findDomainByCompanyId(companyId);
        boolean fromDart = false;
        if (domain != null && domain.endsWith(".dart.local")) {
            String corpCode = domain.substring(0, 8);
            DartApiClient.DartCompanyData dartData = dartApiClient.getCompanyData(corpCode);
            if (dartData != null) {
                if (dartData.employeeCount != null) employeeCount = dartData.employeeCount;
                if (dartData.estDt != null) foundedAt = dartData.estDt;
                if (dartData.hmUrl != null && !dartData.hmUrl.isBlank()) {
                    homepageUrl = dartData.hmUrl;
                    String realDomain = extractDomain(homepageUrl);
                    if (realDomain != null && !realDomain.isBlank()) {
                        syncMapper.updateCompanyDomain(companyId, realDomain);
                    }
                }
                fromDart = true;
            }
        }

        Long profileId = syncMapper.findCompanyProfileIdByCompanyId(companyId);
        if (profileId == null) {
            syncMapper.insertCompanyProfile(companyId, address, employeeCount, foundedAt, homepageUrl, SOURCE_TYPE_PUBLIC_PENSION);
            log.info("Created new company profile for company ID: {}", companyId);
        } else {
            syncMapper.updateCompanyProfile(companyId, address, employeeCount, foundedAt, homepageUrl);
            log.info("Updated existing company profile for company ID: {}", companyId);
        }

        if (pensionData != null) {
            Long sourceId = syncMapper.findProfileSourceId(companyId, SOURCE_TYPE_PUBLIC_PENSION);
            if (sourceId == null) {
                syncMapper.insertProfileSource(companyId, SOURCE_TYPE_PUBLIC_PENSION, SOURCE_NAME_PENSION, SOURCE_URL_PENSION);
            } else {
                syncMapper.touchProfileSource(companyId, SOURCE_TYPE_PUBLIC_PENSION);
            }
        }
        
        if (fromDart) {
            Long sourceId = syncMapper.findProfileSourceId(companyId, SOURCE_TYPE_DART);
            if (sourceId == null) {
                syncMapper.insertProfileSource(companyId, SOURCE_TYPE_DART, "DART_전자공시시스템", "https://opendart.fss.or.kr/");
            } else {
                syncMapper.touchProfileSource(companyId, SOURCE_TYPE_DART);
            }
        }
    }

    private String extractDomain(String url) {
        String domain = url.trim().toLowerCase();
        domain = domain.replaceFirst("^(https?://)", "");
        domain = domain.replaceFirst("^(www\\.)", "");
        int slashIndex = domain.indexOf('/');
        if (slashIndex > 0) {
            domain = domain.substring(0, slashIndex);
        }
        return domain;
    }
}
