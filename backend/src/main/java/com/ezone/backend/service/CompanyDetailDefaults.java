package com.ezone.backend.service;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.LinkedHashMap;
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

    private static final Map<String, String> CANONICAL_COMPANY_NAMES = aliases(
        alias("NAVER", "네이버"),
        alias("Naver Corp", "네이버"),
        alias("네이버 주식회사", "네이버"),
        alias("DB Inc.", "DB Inc"),
        alias("DB아이엔씨", "DB Inc"),
        alias("디비아이엔씨", "DB Inc")
    );

    private static final Map<String, CompanyDefaults> KNOWN_COMPANIES = knownCompanies(
        known("한국산업은행", "kdb.co.kr", "금융권", "공공기관", "금융/AI"),
        known("KDB산업은행", "kdb.co.kr", "금융권", "공공기관", "금융/AI"),
        known("산업은행", "kdb.co.kr", "금융권", "공공기관", "금융/AI"),
        known("연합인포맥스", "einfomax.co.kr", "중견기업", "중견기업", "금융정보/IT"),
        known("한국선급", "krs.co.kr", "공공기관", "공공기관", "해양/AI"),
        known("KR", "krs.co.kr", "공공기관", "공공기관", "해양/AI"),
        known("에스넷시스템", "snetsystems.co.kr", "중견기업", "중견기업", "AI/ICT"),
        known("레브잇", "team.alwayz.co", "스타트업", "스타트업", "커머스/AI"),
        known("마드라스체크", "flow.team", "스타트업", "중소기업", "SaaS/AI"),
        known("에너자이", "enerzai.com", "스타트업", "스타트업", "AI"),
        known("에스아이에이", "si-analytics.ai", "스타트업", "중소기업", "AI/위성영상"),
        known("(주)에스아이에이", "si-analytics.ai", "스타트업", "중소기업", "AI/위성영상"),
        known("주)에스아이에이", "si-analytics.ai", "스타트업", "중소기업", "AI/위성영상"),
        known("소크라에이아이", "socra.ai", "스타트업", "중소기업", "AI/에듀테크"),
        known("Socra AI", "socra.ai", "스타트업", "중소기업", "AI/에듀테크"),
        known("보스반도체", "boss-semi.com", "스타트업", "중소기업", "반도체"),
        known("애자일소다", "agilesoda.ai", "스타트업", "중소기업", "AI"),
        known("케이뱅크", "kbanknow.com", "금융권", "대기업", "금융"),
        known("HL만도", "hlmando.com", "대기업", "대기업", "모빌리티"),
        known("아이엠티", "imt-c.co.kr", "중소기업", "중소기업", "반도체"),
        known("마이다스그룹", "midas.co.kr", "중견기업", "중견기업", "IT"),
        known("카카오", "kakao.com", "대기업", "대기업", "IT/플랫폼"),
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
        known("DB Inc", "dbinc.co.kr", "유가증권시장", "대기업", "IT서비스/무역"),
        known("DB Inc.", "dbinc.co.kr", "유가증권시장", "대기업", "IT서비스/무역"),
        known("DB아이엔씨", "dbinc.co.kr", "유가증권시장", "대기업", "IT서비스/무역"),
        known("디비아이엔씨", "dbinc.co.kr", "유가증권시장", "대기업", "IT서비스/무역"),
        known("저축은행중앙회", "fsb.or.kr", "금융권", "중견기업", "금융"),
        known("AXA손해보험", "axa.co.kr", "금융권", "대기업", "금융"),
        known("NHN Cloud", "nhncloud.com", "대기업", "대기업", "IT/클라우드"),
        known("NICE평가정보", "niceinfo.co.kr", "금융권", "중견기업", "금융/데이터"),
        known("넛지헬스케어", "cashwalk.com", "스타트업", "중소기업", "헬스케어/IT"),
        known("넥슨", "nexon.com", "대기업", "대기업", "게임"),
        known("넥슨코리아", "nexon.com", "대기업", "대기업", "게임"),
        known("노타", "nota.ai", "스타트업", "스타트업", "AI"),
        known("메트라이프생명보험", "metlife.co.kr", "금융권", "대기업", "금융/보험"),
        known("보이저엑스", "voyagerx.com", "스타트업", "스타트업", "AI/소프트웨어"),
        known("삼일회계법인", "pwc.com", "대기업", "대기업", "전문서비스"),
        known("샘표식품", "sempio.com", "중견기업", "중견기업", "식품"),
        known("세미파이브", "semifive.com", "스타트업", "중소기업", "반도체"),
        known("솔브레인", "soulbrain.co.kr", "중견기업", "중견기업", "소재/제조"),
        known("슈퍼브에이아이", "superb-ai.com", "스타트업", "스타트업", "AI"),
        known("스트라드비젼", "stradvision.com", "스타트업", "중견기업", "AI/모빌리티"),
        known("시큐레터", "seculetter.com", "중소기업", "중소기업", "보안"),
        known("아모레퍼시픽", "apgroup.com", "대기업", "대기업", "제조/뷰티"),
        known("아우토클립트", "autocrypt.co.kr", "스타트업", "중소기업", "보안/모빌리티"),
        known("안랩", "ahnlab.com", "중견기업", "중견기업", "보안"),
        known("야놀자", "yanoljagroup.com", "대기업", "대기업", "여행/플랫폼"),
        known("업스테이지", "upstage.ai", "스타트업", "스타트업", "AI"),
        known("엔닷라이트", "ndotlight.com", "스타트업", "스타트업", "AI/3D"),
        known("엔아이티서비스", "nits-corp.com", "대기업", "대기업", "IT/보안"),
        known("웹젠", "webzen.com", "중견기업", "중견기업", "게임"),
        known("이스트게임즈", "estgames.co.kr", "중소기업", "중소기업", "게임"),
        known("인이지", "ineeji.com", "스타트업", "중소기업", "AI/제조"),
        known("채널코퍼레이션", "channel.io", "스타트업", "스타트업", "SaaS"),
        known("카카오모빌리티", "kakaomobility.com", "대기업", "대기업", "모빌리티"),
        known("커넥트웨이브", "connectwave.co.kr", "중견기업", "중견기업", "커머스/IT"),
        known("코그넥스코리아", "cognex.com", "대기업", "대기업", "AI/제조"),
        known("쿼드마이너", "quadminers.com", "스타트업", "중소기업", "보안"),
        known("테크타카(ARGO)", "argoport.com", "스타트업", "스타트업", "물류/IT"),
        known("토스페이먼츠", "tosspayments.com", "금융권", "대기업", "핀테크"),
        known("티오리(Theori)", "theori.io", "스타트업", "중소기업", "보안"),
        known("파이오링크", "piolink.com", "중견기업", "중견기업", "네트워크/보안"),
        known("펄어비스", "pearlabyss.com", "중견기업", "중견기업", "게임"),
        known("펜타시큐리티", "pentasecurity.co.kr", "중견기업", "중견기업", "보안"),
        known("한미그룹", "hanmi.co.kr", "대기업", "대기업", "제약"),
        known("효성ITX", "hyosungitx.com", "대기업", "대기업", "IT서비스")
    );

    private CompanyDetailDefaults() {
    }

    static CompanyDefaults resolve(String companyName, String sourceUrl) {
        CompanyDefaults known = KNOWN_COMPANIES.get(canonicalCompanyName(companyName));
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
        return Map.entry(canonicalCompanyName(companyName), new CompanyDefaults(domain, companyType, size, industry));
    }

    private static Map.Entry<String, String> alias(String alias, String canonicalName) {
        return Map.entry(normalizeCompanyName(alias), normalizeCompanyName(canonicalName));
    }

    @SafeVarargs
    private static Map<String, CompanyDefaults> knownCompanies(Map.Entry<String, CompanyDefaults>... entries) {
        Map<String, CompanyDefaults> companies = new LinkedHashMap<>();
        for (Map.Entry<String, CompanyDefaults> entry : entries) {
            companies.putIfAbsent(entry.getKey(), entry.getValue());
        }
        return Map.copyOf(companies);
    }

    @SafeVarargs
    private static Map<String, String> aliases(Map.Entry<String, String>... entries) {
        Map<String, String> aliases = new LinkedHashMap<>();
        for (Map.Entry<String, String> entry : entries) {
            aliases.putIfAbsent(entry.getKey(), entry.getValue());
        }
        return Map.copyOf(aliases);
    }

    private static String canonicalCompanyName(String companyName) {
        String normalized = normalizeCompanyName(companyName);
        return CANONICAL_COMPANY_NAMES.getOrDefault(normalized, normalized);
    }

    private static String normalizeCompanyName(String companyName) {
        return String.valueOf(companyName)
            .trim()
            .replace("㈜", "")
            .replace("(주)", "")
            .replace("주)", "")
            .replace("주식회사", "")
            .replaceAll("[\\s.\\-_()]+", "")
            .toLowerCase(Locale.ROOT);
    }

    record CompanyDefaults(String domain, String companyType, String size, String industry) {
    }
}
