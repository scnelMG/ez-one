package com.ezone.backend.service;

import com.ezone.backend.infrastructure.api.NationalPensionApiClient;
import com.ezone.backend.mapper.CompanySyncMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CompanyDataSyncService {

    private static final Logger log = LoggerFactory.getLogger(CompanyDataSyncService.class);

    private final NationalPensionApiClient pensionApiClient;
    private final CompanySyncMapper syncMapper;

    private static final String SOURCE_TYPE_PUBLIC_PENSION = "PUBLIC_DATA_PENSION";
    private static final String SOURCE_NAME_PENSION = "국민연금공단 사업장 내역";
    private static final String SOURCE_URL_PENSION = "https://www.data.go.kr/data/15083277/openapi.do";

    public CompanyDataSyncService(NationalPensionApiClient pensionApiClient, CompanySyncMapper syncMapper) {
        this.pensionApiClient = pensionApiClient;
        this.syncMapper = syncMapper;
    }

    @Transactional
    public void syncCompanyByName(String companyName) {
        // 1. 최적화: 우리 DB에 이미 프로필 정보가 있는지 먼저 확인합니다.
        Long existingCompanyId = syncMapper.findCompanyIdByName(companyName);
        if (existingCompanyId != null) {
            Long existingProfileId = syncMapper.findCompanyProfileIdByCompanyId(existingCompanyId);
            if (existingProfileId != null) {
                log.info("Company {} already has a profile in DB. Skipping API call to save rate limit.", companyName);
                return; // 이미 정보가 있으므로 API 호출 생략 (속도 향상 및 트래픽 절약)
            }
        }

        log.info("Starting on-demand company sync from API for: {}", companyName);

        List<NationalPensionApiClient.CompanyPensionData> dataList = pensionApiClient.searchCompanyByName(companyName);
        if (dataList == null || dataList.isEmpty()) {
            log.info("No data found from National Pension API for: {}", companyName);
            return;
        }

        NationalPensionApiClient.CompanyPensionData pensionData = dataList.get(0);
        
        Long companyId = syncMapper.findCompanyIdByName(companyName);
        if (companyId == null) {
            CompanySyncMapper.CompanyEntity newCompany = new CompanySyncMapper.CompanyEntity(companyName);
            syncMapper.insertCompany(newCompany);
            companyId = newCompany.getId();
            log.info("Created new company record for {} (ID: {})", companyName, companyId);
        }

        Long profileId = syncMapper.findCompanyProfileIdByCompanyId(companyId);
        if (profileId == null) {
            syncMapper.insertCompanyProfile(companyId, pensionData.getAddress(), pensionData.getEmployeeCount(), SOURCE_TYPE_PUBLIC_PENSION);
            log.info("Created new company profile for company ID: {}", companyId);
        } else {
            syncMapper.updateCompanyProfile(companyId, pensionData.getAddress(), pensionData.getEmployeeCount());
            log.info("Updated existing company profile for company ID: {}", companyId);
        }

        Long sourceId = syncMapper.findProfileSourceId(companyId, SOURCE_TYPE_PUBLIC_PENSION);
        if (sourceId == null) {
            syncMapper.insertProfileSource(companyId, SOURCE_TYPE_PUBLIC_PENSION, SOURCE_NAME_PENSION, SOURCE_URL_PENSION);
        } else {
            syncMapper.touchProfileSource(companyId, SOURCE_TYPE_PUBLIC_PENSION);
        }
    }
}
