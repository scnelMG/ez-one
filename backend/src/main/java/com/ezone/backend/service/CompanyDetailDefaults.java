package com.ezone.backend.service;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

final class CompanyDetailDefaults {

    static final String UNKNOWN_KO = "미확인";
    static final String UNKNOWN_DOMAIN = "unknown";
    static final String UNVERIFIED = "unverified";

    private static final Set<String> JOB_BOARD_HOSTS = Set.of(
        "jasoseol.com",
        "saramin.co.kr",
        "jobkorea.co.kr",
        "wanted.co.kr",
        "incruit.com",
        "catch.co.kr",
        "linkareer.com",
        "programmers.co.kr"
    );

    private static final Map<String, CompanyDefaults> KNOWN_COMPANIES = Map.ofEntries(
        known("카카오뱅크", "kakaobank.com", "대기업", "대기업", "금융"),
        known("KB국민은행", "kbstar.com", "금융권", "대기업", "금융"),
        known("국민은행", "kbstar.com", "금융권", "대기업", "금융"),
        known("신한은행", "shinhan.com", "금융권", "대기업", "금융"),
        known("하나은행", "kebhana.com", "금융권", "대기업", "금융"),
        known("우리은행", "wooribank.com", "금융권", "대기업", "금융"),
        known("토스뱅크", "tossbank.com", "금융권", "대기업", "금융"),
        known("카카오페이", "kakaopay.com", "대기업", "대기업", "금융"),
        known("네이버", "navercorp.com", "대기업", "대기업", "IT/플랫폼"),
        known("네이버페이", "naverfincorp.com", "대기업", "대기업", "금융"),
        known("라인", "line.me", "대기업", "대기업", "IT/플랫폼"),
        known("LINE", "line.me", "대기업", "대기업", "IT/플랫폼"),
        known("쿠팡", "coupang.com", "대기업", "대기업", "커머스"),
        known("당근", "daangn.com", "스타트업", "스타트업", "IT/플랫폼"),
        known("신용보증기금", "kodit.co.kr", "공공기관", "공공기관", "공공/금융"),
        known("신용보증기금(KODIT)", "kodit.co.kr", "공공기관", "공공기관", "공공/금융"),
        known("한국교통안전공단", "kotsa.or.kr", "공공기관", "공공기관", "공공"),
        known("한국교통안전공단(KOTSA)", "kotsa.or.kr", "공공기관", "공공기관", "공공"),
        known("한국평가데이터", "kodata.co.kr", "금융권", "중견기업", "금융/데이터"),
        known("저축은행중앙회", "fsb.or.kr", "금융권", "중견기업", "금융"),
        known("AXA손해보험", "axa.co.kr", "금융권", "대기업", "금융")
    );

    private CompanyDetailDefaults() {
    }

    static CompanyDefaults resolve(String companyName, String sourceUrl) {
        CompanyDefaults known = KNOWN_COMPANIES.get(normalizeCompanyName(companyName));
        if (known != null) {
            return known;
        }
        return new CompanyDefaults(domainFromUrl(sourceUrl), UNKNOWN_KO, UNKNOWN_KO, UNKNOWN_KO);
    }

    static String domainFromUrl(String sourceUrl) {
        if (sourceUrl == null || sourceUrl.isBlank()) {
            return UNKNOWN_DOMAIN;
        }

        try {
            URI uri = new URI(sourceUrl);
            String host = uri.getHost();
            if (host == null || host.isBlank()) {
                return UNKNOWN_DOMAIN;
            }
            String normalizedHost = normalizeHost(host);
            return isKnownJobBoardHost(normalizedHost) ? UNKNOWN_DOMAIN : normalizedHost;
        } catch (URISyntaxException exception) {
            return UNKNOWN_DOMAIN;
        }
    }

    private static String normalizeHost(String host) {
        String normalized = host.toLowerCase(Locale.ROOT);
        return normalized.startsWith("www.") ? normalized.substring(4) : normalized;
    }

    private static boolean isKnownJobBoardHost(String host) {
        return JOB_BOARD_HOSTS.stream().anyMatch(jobBoard -> host.equals(jobBoard) || host.endsWith("." + jobBoard));
    }

    private static Map.Entry<String, CompanyDefaults> known(
        String companyName,
        String domain,
        String companyType,
        String size,
        String industry
    ) {
        return Map.entry(normalizeCompanyName(companyName), new CompanyDefaults(domain, companyType, size, industry));
    }

    private static String normalizeCompanyName(String companyName) {
        return String.valueOf(companyName)
            .trim()
            .replaceAll("\\s+", "")
            .toLowerCase(Locale.ROOT);
    }

    record CompanyDefaults(String domain, String companyType, String size, String industry) {
    }
}
