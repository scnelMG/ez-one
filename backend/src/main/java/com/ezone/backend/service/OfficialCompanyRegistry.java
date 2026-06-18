package com.ezone.backend.service;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

final class OfficialCompanyRegistry {

    private static final String FTC_SOURCE_TYPE = "FTC_BUSINESS_GROUP";
    private static final String FTC_SOURCE_NAME = "공정거래위원회 기업집단포털";
    private static final String FTC_SOURCE_URL = "https://www.egroup.go.kr/";
    private static final String FTC_NOTE = "공시대상기업집단 소속회사 기준";

    private static final String ALIO_SOURCE_TYPE = "ALIO_PUBLIC_INSTITUTION";
    private static final String ALIO_SOURCE_NAME = "ALIO 공공기관 경영정보 공개시스템";
    private static final String ALIO_SOURCE_URL = "https://alio.go.kr/";
    private static final String ALIO_NOTE = "공공기관 경영정보 공개시스템 기준";

    private static final String OFFICIAL_SITE_SOURCE_TYPE = "OFFICIAL_SITE";
    private static final String OFFICIAL_SITE_SOURCE_NAME = "공식 홈페이지";
    private static final String OFFICIAL_SITE_NOTE = "회사 공식 홈페이지 기준";

    private static final Map<String, OfficialCompany> COMPANIES = buildCompanies();

    private OfficialCompanyRegistry() {
    }

    static Optional<OfficialCompany> resolve(String companyName) {
        return Optional.ofNullable(COMPANIES.get(normalize(companyName)));
    }

    private static Map<String, OfficialCompany> buildCompanies() {
        Map<String, OfficialCompany> companies = new LinkedHashMap<>();
        put(companies, "카카오뱅크", "kakaobank.com", "대기업", "대기업", "금융", "https://www.kakaobank.com",
            FTC_SOURCE_TYPE, FTC_SOURCE_NAME, FTC_SOURCE_URL, FTC_NOTE);
        put(companies, "카카오", "kakaocorp.com", "대기업", "대기업", "IT/플랫폼", "https://www.kakaocorp.com",
            FTC_SOURCE_TYPE, FTC_SOURCE_NAME, FTC_SOURCE_URL, FTC_NOTE);
        put(companies, "카카오페이", "kakaopay.com", "대기업", "대기업", "금융", "https://www.kakaopay.com",
            FTC_SOURCE_TYPE, FTC_SOURCE_NAME, FTC_SOURCE_URL, FTC_NOTE);
        put(companies, "네이버", "navercorp.com", "대기업", "대기업", "IT/플랫폼", "https://www.navercorp.com",
            FTC_SOURCE_TYPE, FTC_SOURCE_NAME, FTC_SOURCE_URL, FTC_NOTE);
        put(companies, "NAVER Cloud", "navercloudcorp.com", "대기업", "대기업", "IT/클라우드", "https://www.navercloudcorp.com",
            FTC_SOURCE_TYPE, FTC_SOURCE_NAME, FTC_SOURCE_URL, FTC_NOTE);
        put(companies, "네이버페이", "naverfincorp.com", "대기업", "대기업", "금융", "https://www.naverfincorp.com",
            FTC_SOURCE_TYPE, FTC_SOURCE_NAME, FTC_SOURCE_URL, FTC_NOTE);
        put(companies, "LINE", "line.me", "대기업", "대기업", "IT/플랫폼", "https://line.me",
            FTC_SOURCE_TYPE, FTC_SOURCE_NAME, FTC_SOURCE_URL, FTC_NOTE);
        put(companies, "KB국민은행", "kbstar.com", "대기업", "대기업", "금융", "https://www.kbstar.com",
            FTC_SOURCE_TYPE, FTC_SOURCE_NAME, FTC_SOURCE_URL, FTC_NOTE);
        put(companies, "신한은행", "shinhan.com", "대기업", "대기업", "금융", "https://www.shinhan.com",
            FTC_SOURCE_TYPE, FTC_SOURCE_NAME, FTC_SOURCE_URL, FTC_NOTE);
        put(companies, "하나은행", "kebhana.com", "대기업", "대기업", "금융", "https://www.kebhana.com",
            FTC_SOURCE_TYPE, FTC_SOURCE_NAME, FTC_SOURCE_URL, FTC_NOTE);
        put(companies, "우리은행", "wooribank.com", "대기업", "대기업", "금융", "https://www.wooribank.com",
            FTC_SOURCE_TYPE, FTC_SOURCE_NAME, FTC_SOURCE_URL, FTC_NOTE);
        put(companies, "IBK 기업은행", "ibk.co.kr", "공공기관", "공공기관", "금융", "https://www.ibk.co.kr",
            ALIO_SOURCE_TYPE, ALIO_SOURCE_NAME, ALIO_SOURCE_URL, ALIO_NOTE);
        put(companies, "신용보증기금", "kodit.co.kr", "공공기관", "공공기관", "공공/금융", "https://www.kodit.co.kr",
            ALIO_SOURCE_TYPE, ALIO_SOURCE_NAME, ALIO_SOURCE_URL, ALIO_NOTE);
        put(companies, "신용보증기금(KODIT)", "kodit.co.kr", "공공기관", "공공기관", "공공/금융", "https://www.kodit.co.kr",
            ALIO_SOURCE_TYPE, ALIO_SOURCE_NAME, ALIO_SOURCE_URL, ALIO_NOTE);
        put(companies, "한국교통안전공단", "kotsa.or.kr", "공공기관", "공공기관", "공공", "https://www.kotsa.or.kr",
            ALIO_SOURCE_TYPE, ALIO_SOURCE_NAME, ALIO_SOURCE_URL, ALIO_NOTE);
        put(companies, "한국교통안전공단(KOTSA)", "kotsa.or.kr", "공공기관", "공공기관", "공공", "https://www.kotsa.or.kr",
            ALIO_SOURCE_TYPE, ALIO_SOURCE_NAME, ALIO_SOURCE_URL, ALIO_NOTE);
        put(companies, "예금보험공사", "kdic.or.kr", "공공기관", "공공기관", "공공/금융", "https://www.kdic.or.kr",
            ALIO_SOURCE_TYPE, ALIO_SOURCE_NAME, ALIO_SOURCE_URL, ALIO_NOTE);
        put(companies, "한국은행", "bok.or.kr", "공공기관", "공공기관", "공공/금융", "https://www.bok.or.kr",
            ALIO_SOURCE_TYPE, ALIO_SOURCE_NAME, ALIO_SOURCE_URL, ALIO_NOTE);
        put(companies, "한국전력거래소", "kpx.or.kr", "공공기관", "공공기관", "공공/에너지", "https://www.kpx.or.kr",
            ALIO_SOURCE_TYPE, ALIO_SOURCE_NAME, ALIO_SOURCE_URL, ALIO_NOTE);
        put(companies, "전력거래소", "kpx.or.kr", "공공기관", "공공기관", "공공/에너지", "https://www.kpx.or.kr",
            ALIO_SOURCE_TYPE, ALIO_SOURCE_NAME, ALIO_SOURCE_URL, ALIO_NOTE);
        put(companies, "한국언론진흥재단", "kpf.or.kr", "공공기관", "공공기관", "공공/언론", "https://www.kpf.or.kr",
            OFFICIAL_SITE_SOURCE_TYPE, OFFICIAL_SITE_SOURCE_NAME, "https://www.kpf.or.kr", OFFICIAL_SITE_NOTE);
        put(companies, "한국교육학술정보원", "keris.or.kr", "공공기관", "공공기관", "교육/공공", "https://www.keris.or.kr",
            OFFICIAL_SITE_SOURCE_TYPE, OFFICIAL_SITE_SOURCE_NAME, "https://www.keris.or.kr", OFFICIAL_SITE_NOTE);
        put(companies, "현대글로비스", "glovis.net", "대기업", "대기업", "물류/SCM", "https://www.glovis.net",
            OFFICIAL_SITE_SOURCE_TYPE, OFFICIAL_SITE_SOURCE_NAME, "https://www.glovis.net", OFFICIAL_SITE_NOTE);
        put(companies, "디지털대성", "digitaldaesung.co.kr", "중견기업", "중견기업", "교육", "https://www.digitaldaesung.co.kr",
            OFFICIAL_SITE_SOURCE_TYPE, OFFICIAL_SITE_SOURCE_NAME, "https://www.digitaldaesung.co.kr", OFFICIAL_SITE_NOTE);
        put(companies, "빗썸", "bithumb.com", "대기업", "대기업", "금융/가상자산", "https://www.bithumb.com",
            OFFICIAL_SITE_SOURCE_TYPE, OFFICIAL_SITE_SOURCE_NAME, "https://www.bithumb.com", OFFICIAL_SITE_NOTE);
        return Collections.unmodifiableMap(companies);
    }

    private static void put(
        Map<String, OfficialCompany> companies,
        String name,
        String domain,
        String companyType,
        String size,
        String industry,
        String homepageUrl,
        String sourceType,
        String sourceName,
        String sourceUrl,
        String sourceNote
    ) {
        companies.put(
            normalize(name),
            new OfficialCompany(domain, companyType, size, industry, homepageUrl, sourceType, sourceName, sourceUrl, sourceNote)
        );
    }

    private static String normalize(String companyName) {
        return String.valueOf(companyName)
            .replaceAll("\\([^)]*\\)", "")
            .replaceAll("\\s+", "")
            .trim()
            .toLowerCase(Locale.ROOT);
    }

    record OfficialCompany(
        String domain,
        String companyType,
        String size,
        String industry,
        String homepageUrl,
        String sourceType,
        String sourceName,
        String sourceUrl,
        String sourceNote
    ) {
    }
}
