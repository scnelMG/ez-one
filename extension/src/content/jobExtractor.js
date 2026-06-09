const KOREAN_ROLE_LABELS = ['\uBAA8\uC9D1 \uC9C1\uBB34', '\uBAA8\uC9D1 \uBD80\uBB38', '\uC9C0\uC6D0 \uBD84\uC57C'];
const KOREAN_ESSAY_LABEL = '\uC790\uAE30\uC18C\uAC1C\uC11C';
const KOREAN_ESSAY_WRITE = '\uC790\uAE30\uC18C\uAC1C\uC11C \uC4F0\uAE30';
const KOREAN_COMPANY_ICON = '\uAE30\uC5C5 \uC544\uC774\uCF58';

export function extractJobPosting(documentRef = document, sourceUrl = documentRef.location.href) {
    const postingRoot = findPostingRoot(documentRef, sourceUrl);
    const jasoseolData = extractJasoseolPageData(documentRef);
    const title = cleanText(postingRoot.querySelector('[data-ezone-title]')?.textContent) ||
        cleanText(postingRoot.querySelector('h1')?.textContent) ||
        cleanText(postingRoot.querySelector('h2')?.textContent) ||
        null;
    return {
        companyName: extractCompanyName(postingRoot, jasoseolData),
        positionTitle: title,
        deadlineLabel: extractDeadlineLabel(postingRoot, jasoseolData),
        sourceUrl,
        logoUrl: extractLogoUrl(postingRoot, sourceUrl) || extractLogoUrl(documentRef, sourceUrl),
        roleOptions: extractRoleOptions(postingRoot, jasoseolData),
        essayQuestions: extractEssayQuestions(postingRoot)
    };
}

function extractCompanyName(documentRef, jasoseolData) {
    return cleanText(documentRef.querySelector('[data-ezone-company]')?.textContent) ||
        cleanText(documentRef.querySelector('a[href*="/companies/"] h2, a[href*="/company/"] h2')?.textContent) ||
        cleanText(documentRef.querySelector('a[href*="/companies/"], a[href*="/company/"]')?.textContent) ||
        extractCompanyNearTitle(documentRef) ||
        jasoseolData.companyName ||
        null;
}

function extractDeadlineLabel(documentRef, jasoseolData) {
    const datetime = documentRef.querySelector('time')?.getAttribute('datetime');
    return cleanText(documentRef.querySelector('[data-ezone-deadline]')?.textContent) ||
        cleanText(documentRef.querySelector('time')?.textContent) ||
        datetime ||
        extractDeadlineText(documentRef) ||
        jasoseolData.deadlineLabel ||
        null;
}

function extractRoleOptions(documentRef, jasoseolData) {
    const explicitRoles = Array.from(documentRef.querySelectorAll('[data-ezone-role]'))
        .map((item) => cleanText(item.textContent))
        .filter(Boolean);
    if (explicitRoles.length > 0) {
        return unique(explicitRoles);
    }
    if (jasoseolData.roleOptions.length > 0) {
        return jasoseolData.roleOptions;
    }
    const tableRoles = extractModalTableRoles(documentRef);
    if (tableRoles.length > 0) {
        return tableRoles;
    }
    const roleSection = findSection(documentRef, [...KOREAN_ROLE_LABELS, 'Recruiting roles']) ??
        findLikelyRoleSection(documentRef);
    const roleTexts = roleSection
        ? Array.from(roleSection.querySelectorAll('label, li')).map((item) => cleanText(item.textContent))
        : [];
    return unique(roleTexts.filter((value) => Boolean(value) && !isActionText(value)));
}

function extractEssayQuestions(documentRef) {
    const questionSection = findSection(documentRef, [KOREAN_ESSAY_LABEL, 'Essay']);
    if (!questionSection) {
        return [];
    }
    return Array.from(questionSection.querySelectorAll('article, li')).flatMap((item) => {
        const prompt = cleanText(item.querySelector('p, strong, h3')?.textContent);
        if (!prompt) {
            return [];
        }
        return [{
            prompt,
            maxLength: extractMaxLength(cleanText(item.textContent))
        }];
    });
}

function extractLogoUrl(documentRef, sourceUrl) {
    const explicit = documentRef.querySelector('[data-ezone-logo]');
    const explicitValue = explicit?.getAttribute('src') || explicit?.getAttribute('content') || explicit?.getAttribute('href');
    const ogImage = documentRef.querySelector('meta[property="og:image"], meta[name="og:image"]')?.getAttribute('content');
    const logoImage = Array.from(documentRef.querySelectorAll('img')).find((image) => {
        const text = [
            image.getAttribute('alt'),
            image.getAttribute('title'),
            image.getAttribute('class'),
            image.getAttribute('src')
        ].filter(Boolean).join(' ').toLowerCase();
        return text.includes('logo') || text.includes(KOREAN_COMPANY_ICON);
    })?.getAttribute('src');
    return absoluteHttpUrl(explicitValue || logoImage || ogImage, sourceUrl);
}

function absoluteHttpUrl(value, sourceUrl) {
    if (!value) {
        return null;
    }
    try {
        const url = new URL(value, sourceUrl);
        return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
    }
    catch {
        return null;
    }
}

function findSection(documentRef, labels) {
    const candidates = Array.isArray(labels) ? labels : [labels];
    return Array.from(documentRef.querySelectorAll('section, [role="region"]')).find((section) => candidates.some((label) => section.getAttribute('aria-label')?.includes(label) ||
        cleanText(section.querySelector('h2, h3')?.textContent)?.includes(label)));
}

function findLikelyRoleSection(documentRef) {
    return Array.from(documentRef.querySelectorAll('section')).find((section) => {
        const options = section.querySelectorAll('label, li');
        const text = cleanText(section.textContent) ?? '';
        return options.length > 0 && options.length <= 20 && !text.includes(KOREAN_ESSAY_LABEL);
    }) ?? null;
}

function findPostingRoot(documentRef, sourceUrl) {
    return findCurrentRecruitSlideRoot(documentRef) ??
        findExplicitModalRoot(documentRef) ??
        findSelectedRecruitRoot(documentRef, sourceUrl) ??
        findFloatingPostingRoot(documentRef) ??
        documentRef;
}

function findCurrentRecruitSlideRoot(documentRef) {
    return Array.from(documentRef.querySelectorAll('.recruit-slide[data-current="true"], [data-current="true"].recruit-slide'))
        .find((candidate) => candidate.querySelector('h1') && hasDeadlineText(cleanText(candidate.textContent) ?? '')) ??
        null;
}

function findExplicitModalRoot(documentRef) {
    return Array.from(documentRef.querySelectorAll('[aria-modal="true"], [role="dialog"], [class*="modal"], [class*="Modal"]'))
        .find((candidate) => {
            const text = cleanText(candidate.textContent) ?? '';
            return candidate.querySelector('h1') && (text.includes(KOREAN_ESSAY_LABEL) || text.includes('채용'));
        }) ?? null;
}

function findFloatingPostingRoot(documentRef) {
    const candidates = Array.from(documentRef.querySelectorAll('main, article, section, div'))
        .filter((candidate) => {
            const text = cleanText(candidate.textContent) ?? '';
            return candidate.querySelector('h1') &&
                (text.includes(KOREAN_ESSAY_WRITE) || text.includes('자기소개서')) &&
                hasDeadlineText(text);
        });
    return candidates
        .sort((left, right) => (cleanText(left.textContent)?.length ?? 0) -
            (cleanText(right.textContent)?.length ?? 0))[0] ?? null;
}

function findSelectedRecruitRoot(documentRef, sourceUrl) {
    if (!isJasoseolRecruitUrl(sourceUrl)) {
        return null;
    }
    const candidates = Array.from(documentRef.querySelectorAll('article, section, div'))
        .filter((candidate) => {
            const text = cleanText(candidate.textContent) ?? '';
            return candidate.querySelector('h1, h2') &&
                hasDeadlineText(text) &&
                hasRecruitRoleTable(candidate);
        });
    return candidates
        .sort((left, right) => scoreRecruitRoot(right) - scoreRecruitRoot(left) ||
            (cleanText(left.textContent)?.length ?? 0) - (cleanText(right.textContent)?.length ?? 0))[0] ?? null;
}

function isJasoseolRecruitUrl(sourceUrl) {
    try {
        const url = new URL(sourceUrl);
        return url.hostname.endsWith('jasoseol.com') && url.pathname.startsWith('/recruit');
    }
    catch {
        return false;
    }
}

function hasRecruitRoleTable(root) {
    return getRoleRowCandidates(root).some((row) => /\d+\s*명\s*작성/.test(cleanText(row.textContent) ?? '') ||
        (cleanText(row.textContent) ?? '').includes(KOREAN_ESSAY_LABEL));
}

function scoreRecruitRoot(root) {
    const text = cleanText(root.textContent) ?? '';
    let score = 0;
    if (root.matches('.recruit-slide, article')) {
        score += 4;
    }
    if (root.querySelector('table')) {
        score += 3;
    }
    if (text.includes('\uC81C\uCD9C \uC11C\uB958 \uBC1B\uAE30')) {
        score += 2;
    }
    if (text.includes(KOREAN_ROLE_LABELS[0])) {
        score += 1;
    }
    return score;
}

function extractCompanyNearTitle(documentRef) {
    const title = cleanText(documentRef.querySelector('h1, h2')?.textContent);
    return Array.from(documentRef.querySelectorAll('strong, b, a, span, h2'))
        .map((item) => cleanText(item.textContent))
        .find((text) => text &&
            text !== title &&
            text.length <= 40 &&
            !isActionText(text) &&
            !/채용|공고|조회|방문|즐겨찾기|남음/.test(text)) ||
        cleanText(documentRef.querySelector('img[alt]')?.getAttribute('alt')) ||
        null;
}

function extractDeadlineText(documentRef) {
    return Array.from(documentRef.querySelectorAll('time, p, span, div'))
        .map((item) => cleanText(item.textContent))
        .map((text) => text ? extractDeadlineRange(text) : null)
        .find(Boolean) ||
        null;
}

function hasDeadlineText(text) {
    return Boolean(extractDeadlineRange(text)) || /(\d{4}-\d{2}-\d{2}).*~/.test(text);
}

function extractDeadlineRange(text) {
    return text.match(/\d{4}년\s*\d{1,2}월\s*\d{1,2}일\s*\d{1,2}:\d{2}\s*~\s*\d{4}년\s*\d{1,2}월\s*\d{1,2}일\s*\d{1,2}:\d{2}/)?.[0] ||
        text.match(/\d{4}-\d{2}-\d{2}[^~]{0,30}~[^()]{0,60}/)?.[0]?.trim() ||
        null;
}

function extractModalTableRoles(documentRef) {
    return unique(getRoleRowCandidates(documentRef).flatMap((row) => {
        const cells = Array.from(row.querySelectorAll('td, th'))
            .map((cell) => cleanText(cell.textContent))
            .filter(Boolean);
        const role = cells.length >= 2
            ? cells.find(isRoleText)
            : parseRoleFromRowText(cleanText(row.textContent));
        return role ? [role] : [];
    }));
}

function getRoleRowCandidates(root) {
    return Array.from(root.querySelectorAll('tr, li')).filter((row) => {
        const text = cleanText(row.textContent) ?? '';
        return /\d+\s*명\s*작성/.test(text) || text.includes(KOREAN_ESSAY_WRITE);
    });
}

function isRoleText(text) {
    return Boolean(text) &&
        text.length > 3 &&
        !/^(인턴|신입|경력|신입\/경력)$/.test(text) &&
        !/\d+\s*명\s*작성/.test(text) &&
        !isActionText(text);
}

function parseRoleFromRowText(text) {
    if (!text) {
        return null;
    }
    const cleaned = text
        .replace(KOREAN_ESSAY_WRITE, '')
        .replace(/\d+\s*명\s*작성/g, '')
        .replace(/^(인턴|신입|경력|신입\/경력)\s*/, '')
        .trim();
    return isRoleText(cleaned) ? cleaned : null;
}

function isActionText(text) {
    return text.includes(KOREAN_ESSAY_WRITE) ||
        /\uC81C\uCD9C\s*\uC11C\uB958\s*\uBC1B\uAE30|\uACF5\uACE0\s*\uACF5\uC720|\uC990\uACA8\uCC3E\uAE30|\uC624\uB958\s*\uC2E0\uACE0|\uCC44\uC6A9\s*\uC0AC\uC774\uD2B8/.test(text);
}

function extractMaxLength(text) {
    if (!text) {
        return null;
    }
    const match = text.match(/(\d{2,5})/);
    return match ? Number(match[1]) : null;
}

function cleanText(value) {
    const cleaned = value?.replace(/\s+/g, ' ').trim();
    return cleaned || null;
}

function unique(values) {
    return Array.from(new Set(values));
}

function extractJasoseolPageData(documentRef) {
    const empty = {
        companyName: null,
        deadlineLabel: null,
        roleOptions: []
    };
    const rawJson = documentRef.querySelector('#__NEXT_DATA__')?.textContent;
    if (!rawJson) {
        return empty;
    }
    try {
        const parsed = JSON.parse(rawJson);
        const company = readRecordPath(parsed, ['props', 'pageProps', 'initialEmploymentCompany']);
        const employments = Array.isArray(company?.employments) ? company.employments : [];
        return {
            companyName: readString(company, 'name'),
            deadlineLabel: readString(company, 'end_time'),
            roleOptions: unique(employments
                .map((employment) => readString(asRecord(employment), 'field'))
                .filter(Boolean))
        };
    }
    catch {
        return empty;
    }
}

function readRecordPath(source, path) {
    return path.reduce((current, key) => {
        if (!current) {
            return null;
        }
        return asRecord(current[key]);
    }, source);
}

function readString(source, key) {
    const value = source?.[key];
    return typeof value === 'string' ? cleanText(value) : null;
}

function asRecord(value) {
    return value && typeof value === 'object' ? value : null;
}

window.ezOneExtractJobPosting = () => extractJobPosting();
if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage && !window.ezOneJobExtractorListenerReady) {
    window.ezOneJobExtractorListenerReady = true;
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
        if (message?.type !== 'EZONE_EXTRACT_JOB') {
            return false;
        }
        sendResponse(extractJobPosting());
        return true;
    });
}
