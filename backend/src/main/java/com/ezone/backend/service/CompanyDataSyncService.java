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
        log.info("Starting on-demand company sync for: {}", companyName);

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
