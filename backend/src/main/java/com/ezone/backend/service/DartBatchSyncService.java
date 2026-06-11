package com.ezone.backend.service;

import com.ezone.backend.mapper.DartBatchMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
public class DartBatchSyncService {

    private static final Logger log = LoggerFactory.getLogger(DartBatchSyncService.class);

    private final DartBatchMapper dartBatchMapper;
    private final RestTemplate restTemplate;

    @Value("${OPENDART_API_KEY:}")
    private String apiKey;

    public DartBatchSyncService(DartBatchMapper dartBatchMapper) {
        this.dartBatchMapper = dartBatchMapper;
        this.restTemplate = new RestTemplate();
    }

    // 매일 새벽 2시에 실행
    @Scheduled(cron = "0 0 2 * * ?")
    public void syncDartCompaniesDaily() {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("OPENDART_API_KEY is not configured. Skipping daily batch.");
            return;
        }

        int limit = 10000;
        List<String> pendingCorpCodes = dartBatchMapper.findPendingCorpCodes(limit);
        log.info("Starting daily DART sync for {} companies.", pendingCorpCodes.size());

        for (String corpCode : pendingCorpCodes) {
            try {
                syncCompanyDetails(corpCode);
                Thread.sleep(100); // 0.1초 대기 (API rate limit 우회 목적)
            } catch (Exception e) {
                log.error("Failed to sync company details for corp_code: {}", corpCode, e);
            }
        }
        
        log.info("Finished daily DART sync.");
    }

    private void syncCompanyDetails(String corpCode) {
        String url = String.format("https://opendart.fss.or.kr/api/company.json?crtfc_key=%s&corp_code=%s", apiKey, corpCode);
        
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);
            
            if (response != null && "000".equals(response.get("status"))) {
                String hmUrl = (String) response.get("hm_url");
                String ceoNm = (String) response.get("ceo_nm");
                String corpCls = (String) response.get("corp_cls"); // Y, K, N, E

                String companyCategory = resolveCategory(corpCls);

                dartBatchMapper.updateCompanyProfile(corpCode, hmUrl, ceoNm, companyCategory);

                if (hmUrl != null && !hmUrl.isBlank()) {
                    String domain = extractDomain(hmUrl);
                    if (domain != null && !domain.isBlank()) {
                        dartBatchMapper.updateCompanyDomain(corpCode, domain);
                    }
                }
            } else {
                // API에서 데이터를 찾지 못한 경우에도 더 이상 조회하지 않도록 업데이트
                dartBatchMapper.updateCompanyProfile(corpCode, null, null, null);
            }
        } catch (Exception e) {
            log.warn("Error fetching data for corpCode {}: {}", corpCode, e.getMessage());
        }
    }

    private String resolveCategory(String corpCls) {
        if (corpCls == null) return null;
        return switch (corpCls) {
            case "Y" -> "유가증권시장(코스피)";
            case "K" -> "코스닥시장";
            case "N" -> "코넥스시장";
            case "E" -> "기타(비상장)";
            default -> "기타";
        };
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
