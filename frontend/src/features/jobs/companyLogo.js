const companyDomains = new Map([
    ['우리은행', 'wooribank.com'],
    ['woori bank', 'wooribank.com'],
    ['sk하이닉스', 'skhynix.com'],
    ['sk hynix', 'skhynix.com'],
    ['손해보험협회', 'knia.or.kr'],
    ['아이마켓코리아', 'imarketkorea.com'],
    ['롯데그룹', 'lotte.co.kr'],
    ['롯데월드', 'lotteworld.com'],
    ['홍익대학교', 'hongik.ac.kr'],
    ['인천공항시설관리', 'airportfc.co.kr'],
    ['국가보안기술연구소', 'nsr.re.kr'],
    ['네이버', 'navercorp.com'],
    ['naver', 'navercorp.com'],
    ['카카오페이', 'kakaopay.com'],
    ['kakaopay', 'kakaopay.com'],
    ['토스', 'toss.im'],
    ['toss', 'toss.im'],
    ['line', 'line.me'],
    ['라인', 'line.me'],
    ['당근', 'daangn.com'],
    ['daangn', 'daangn.com'],
    ['서브원', 'serveone.co.kr'],
    ['serveone', 'serveone.co.kr'],
    ['퍼플독', 'purpledog.co.kr'],
    ['purpledog', 'purpledog.co.kr'],
    ['플랜핏', 'planfit.ai'],
    ['planfit', 'planfit.ai']
]);

export function resolveCompanyLogoUrl(source) {
    const explicitLogoUrl = firstNonEmpty(
        source?.companyLogoUrl,
        source?.logoUrl,
        source?.logoImageUrl,
        source?.logo,
        source?.companyLogo
    );
    if (explicitLogoUrl) {
        return normalizeUrl(explicitLogoUrl);
    }
    const domain = firstNonEmpty(
        source?.companyDomain,
        source?.domain,
        source?.homepageDomain,
        domainFromUrl(source?.homepageUrl),
        domainFromUrl(source?.websiteUrl)
    ) ?? domainFromCompanyName(source?.companyName);
    return domain ? logoUrlFor(domain) : null;
}

export function logoUrlFor(domain) {
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(cleanDomain(domain))}&sz=128`;
}

function domainFromCompanyName(companyName) {
    const normalizedName = normalizeCompanyName(companyName);
    if (!normalizedName) {
        return null;
    }
    return companyDomains.get(normalizedName) ?? null;
}

function normalizeCompanyName(companyName) {
    return String(companyName ?? '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');
}

function firstNonEmpty(...values) {
    return values.find((value) => String(value ?? '').trim());
}

function normalizeUrl(value) {
    const trimmed = String(value ?? '').trim();
    if (!trimmed) {
        return null;
    }
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function domainFromUrl(value) {
    try {
        const normalizedUrl = normalizeUrl(value);
        if (!normalizedUrl) {
            return null;
        }
        return new URL(normalizedUrl).hostname.replace(/^www\./i, '');
    }
    catch {
        return null;
    }
}

function cleanDomain(domain) {
    return String(domain ?? '')
        .trim()
        .replace(/^https?:\/\//i, '')
        .replace(/^www\./i, '')
        .replace(/\/.*$/g, '');
}
