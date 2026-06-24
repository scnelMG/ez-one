const KOREAN_ROLE_LABELS = ['\uBAA8\uC9D1 \uC9C1\uBB34', '\uBAA8\uC9D1 \uBD80\uBB38', '\uC9C0\uC6D0 \uBD84\uC57C'];
const KOREAN_ESSAY_LABEL = '\uC790\uAE30\uC18C\uAC1C\uC11C';
const KOREAN_SHORT_ESSAY_LABEL = '\uC790\uC18C\uC11C';
const KOREAN_ESSAY_WRITE = '\uC790\uAE30\uC18C\uAC1C\uC11C \uC4F0\uAE30';
const KOREAN_ESSAY_CREATE = '\uC790\uAE30\uC18C\uAC1C\uC11C \uC791\uC131';
const KOREAN_ESSAY_QUESTION_VIEW = '\uC790\uC18C\uC11C \uBB38\uD56D \uBCF4\uAE30';
const KOREAN_ESSAY_QUESTION_LABEL = '\uC790\uC18C\uC11C \uBB38\uD56D';
const KOREAN_ESSAY_LATER_ADD = '\uB098\uC911\uC5D0 \uC4F8 \uC790\uAE30\uC18C\uAC1C\uC11C\uB85C \uCD94\uAC00';
const KOREAN_COMPANY_ICON = '\uAE30\uC5C5 \uC544\uC774\uCF58';
const JOB_EXTRACTOR_VERSION = '2026-06-19-jasoseol-selected-root-v13';

export function extractJobPosting(documentRef = document, sourceUrl = documentRef.location.href) {
    if (isPlainJasoseolRecruitListUrl(sourceUrl)) {
        return emptyJobPosting(sourceUrl);
    }
    const postingRoot = findPostingRoot(documentRef, sourceUrl);
    const jasoseolData = extractJasoseolPageData(documentRef);
    const roleOptions = extractRoleOptions(postingRoot, jasoseolData);
    const roleEssayQuestions = extractRoleEssayQuestions(postingRoot, roleOptions, documentRef);
    const essayQuestionAvailability = normalizeEssayQuestionAvailability(documentRef.__ezOneEssayQuestionAvailability);
    const essayQuestions = resolveDefaultEssayQuestions(roleOptions, roleEssayQuestions, postingRoot);
    const title = cleanText(postingRoot.querySelector('[data-ezone-title]')?.textContent) ||
        cleanText(postingRoot.querySelector('h1')?.textContent) ||
        cleanText(postingRoot.querySelector('h2')?.textContent) ||
        null;
    const resolvedSourceUrl = extractRecruitingSiteUrl(postingRoot, documentRef, sourceUrl) ?? sourceUrl;
    return {
        companyName: extractCompanyName(postingRoot, jasoseolData),
        positionTitle: title,
        deadlineLabel: extractDeadlineLabel(postingRoot, jasoseolData),
        sourceUrl: resolvedSourceUrl,
        logoUrl: extractLogoUrl(postingRoot, sourceUrl) || extractLogoUrl(documentRef, sourceUrl),
        roleOptions,
        essayQuestions,
        roleEssayQuestions,
        essayQuestionAvailability
    };
}

function emptyJobPosting(sourceUrl) {
    return {
        companyName: null,
        positionTitle: null,
        deadlineLabel: null,
        sourceUrl,
        logoUrl: null,
        roleOptions: [],
        essayQuestions: [],
        roleEssayQuestions: {},
        essayQuestionAvailability: {}
    };
}

export async function extractJobPostingWithInteractions(documentRef = document, sourceUrl = documentRef.location.href, options = {}) {
    await revealEssayQuestions(documentRef, options);
    return extractJobPosting(documentRef, sourceUrl);
}

function extractCompanyName(documentRef, jasoseolData) {
    return cleanText(documentRef.querySelector('[data-ezone-company]')?.textContent) ||
        cleanText(documentRef.querySelector('a[href*="/companies/"] h2, a[href*="/company/"] h2')?.textContent) ||
        cleanText(documentRef.querySelector('a[href*="/companies/"], a[href*="/company/"]')?.textContent) ||
        extractCompanyNearTitle(documentRef) ||
        jasoseolData.companyName ||
        null;
}

async function revealEssayQuestions(documentRef, options = {}) {
    const hoverDelayMs = options.hoverDelayMs ?? 50;
    const essayQuestionTimeoutMs = options.essayQuestionTimeoutMs ?? 500;
    const maxEssayTriggers = options.maxEssayTriggers ?? 12;
    const targetRoles = Array.isArray(options.targetRoles)
        ? options.targetRoles.map(cleanText).filter(Boolean)
        : [];
    const roleEssayQuestions = {};
    const essayQuestionAvailability = {};
    const allCandidates = findEssayTriggerCandidates(documentRef);
    const candidates = allCandidates
        .filter((candidate) => matchesTargetRole(extractRoleFromEssayTrigger(candidate), targetRoles))
        .slice(0, maxEssayTriggers);
    const hasEssaySignal = hasPotentialEssaySignal(documentRef);
    if (targetRoles.length > 0 && allCandidates.length === 0 && !hasEssaySignal) {
        targetRoles.forEach((role) => {
            essayQuestionAvailability[role] = 'none';
        });
    }
    for (const candidate of candidates) {
        const extractedRole = extractRoleFromEssayTrigger(candidate);
        const role = resolveMatchedTargetRole(extractedRole, targetRoles) ?? extractedRole;
        dispatchEssayHoverEvents(candidate, documentRef);
        const questions = await waitForEssayQuestions(documentRef, hoverDelayMs, essayQuestionTimeoutMs);
        if (role && questions.length > 0) {
            roleEssayQuestions[role] = questions;
            essayQuestionAvailability[role] = 'found';
        }
    }
    if (Object.keys(roleEssayQuestions).length > 0) {
        documentRef.__ezOneRoleEssayQuestions = roleEssayQuestions;
    }
    if (Object.keys(essayQuestionAvailability).length > 0 || (targetRoles.length > 0 && allCandidates.length === 0)) {
        documentRef.__ezOneEssayQuestionAvailability = essayQuestionAvailability;
    }
}

function matchesTargetRole(role, targetRoles) {
    if (targetRoles.length === 0) {
        return true;
    }
    return Boolean(resolveMatchedTargetRole(role, targetRoles));
}

function resolveMatchedTargetRole(role, targetRoles) {
    const cleanRole = cleanText(role);
    if (!cleanRole || targetRoles.length === 0) {
        return null;
    }
    return targetRoles.find((targetRole) => roleTextsMatch(cleanRole, targetRole)) ?? null;
}

function roleTextsMatch(left, right) {
    const cleanLeft = cleanText(left);
    const cleanRight = cleanText(right);
    if (!cleanLeft || !cleanRight) {
        return false;
    }
    if (cleanLeft === cleanRight) {
        return true;
    }
    const normalizedLeft = normalizeRoleForMatch(cleanLeft);
    const normalizedRight = normalizeRoleForMatch(cleanRight);
    return normalizedLeft === normalizedRight ||
        normalizedLeft.includes(normalizedRight) ||
        normalizedRight.includes(normalizedLeft);
}

function normalizeRoleForMatch(value) {
    return (cleanText(value) ?? '')
        .normalize('NFKC')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/^(?:신입\s*\/\s*경력|신입·경력|신입∕경력|계약직|인턴|신입|경력)\s*(?:·|-|\/)?\s*/u, '')
        .replace(/^\[[^\]]+\]\s*/, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

function findEssayTriggerCandidates(documentRef) {
    const directTriggers = Array.from(documentRef.querySelectorAll('button, a, [role="button"]'));
    const roleRowTriggers = getRoleRowCandidates(documentRef).flatMap((row) => {
        const controls = Array.from(row.querySelectorAll('button, a, [role="button"]'));
        return controls.length > 0 ? controls : [row];
    });
    return uniqueElements([...directTriggers, ...roleRowTriggers]).filter((item) => {
        return hasEssayActionText(getElementSearchText(item));
    });
}

function getElementSearchText(element) {
    return [
        element?.textContent,
        element?.getAttribute?.('aria-label'),
        element?.getAttribute?.('title'),
        element?.getAttribute?.('value')
    ].map((value) => cleanText(value))
        .filter(Boolean)
        .join(' ');
}

function hasEssayActionText(text) {
    const value = cleanText(text) ?? '';
    return value.includes(KOREAN_ESSAY_WRITE) ||
        value.includes(KOREAN_ESSAY_CREATE) ||
        value.includes(KOREAN_ESSAY_QUESTION_VIEW) ||
        value.includes(KOREAN_ESSAY_LATER_ADD) ||
        ((value.includes(KOREAN_ESSAY_LABEL) || value.includes(KOREAN_SHORT_ESSAY_LABEL)) &&
            /\uC791\uC131|\uC4F0\uAE30|\uBB38\uD56D|\uBCF4\uAE30|\uCD94\uAC00/.test(value));
}

function hasPotentialEssaySignal(documentRef) {
    return Array.from(documentRef.querySelectorAll('button, a, [role="button"], tr, li'))
        .some((item) => hasEssayActionText(getElementSearchText(item)));
}

function uniqueElements(elements) {
    return Array.from(new Set(elements));
}

function dispatchEssayHoverEvents(candidate, documentRef) {
    const roleRow = candidate.closest?.('tr, li');
    uniqueElements([candidate, roleRow].filter(Boolean))
        .forEach((element) => dispatchHoverEvents(element, documentRef));
}

function dispatchHoverEvents(element, documentRef) {
    const eventView = documentRef.defaultView ?? window;
    for (const eventName of ['pointerover', 'mouseover', 'mouseenter', 'focus']) {
        const mouseEventOptions = {
            bubbles: eventName !== 'mouseenter',
            cancelable: true
        };
        if (documentRef.defaultView) {
            mouseEventOptions.view = documentRef.defaultView;
        }
        const event = eventName === 'focus'
            ? new eventView.FocusEvent(eventName, { bubbles: false })
            : new eventView.MouseEvent(eventName, mouseEventOptions);
        element.dispatchEvent(event);
    }
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForEssayQuestions(documentRef, initialDelayMs, timeoutMs) {
    const startedAt = Date.now();
    if (initialDelayMs > 0) {
        await delay(initialDelayMs);
    }
    let questions = extractEssayQuestions(documentRef);
    while (questions.length === 0 && Date.now() - startedAt < timeoutMs) {
        await delay(50);
        questions = extractEssayQuestions(documentRef);
    }
    return questions;
}

function extractDeadlineLabel(documentRef, jasoseolData) {
    const datetime = documentRef.querySelector('time')?.getAttribute('datetime');
    return normalizeDeadlineLabel(cleanText(documentRef.querySelector('[data-ezone-deadline]')?.textContent)) ||
        normalizeDeadlineLabel(cleanText(documentRef.querySelector('time')?.textContent)) ||
        normalizeDeadlineLabel(datetime) ||
        extractDeadlineText(documentRef) ||
        normalizeDeadlineLabel(jasoseolData.deadlineLabel) ||
        null;
}

function extractRoleOptions(documentRef, jasoseolData) {
    const explicitRoles = Array.from(documentRef.querySelectorAll('[data-ezone-role]'))
        .map((item) => cleanText(item.textContent))
        .filter(Boolean);
    if (explicitRoles.length > 0) {
        return unique(explicitRoles);
    }
    const tableRoles = extractModalTableRoles(documentRef);
    if (tableRoles.length > 0 && (jasoseolData.roleOptions.length === 0 || tableRoles.length < jasoseolData.roleOptions.length)) {
        return tableRoles;
    }
    if (jasoseolData.roleOptions.length > 0) {
        return jasoseolData.roleOptions;
    }
    if (tableRoles.length > 0) {
        return tableRoles;
    }
    const roleSection = findSection(documentRef, [...KOREAN_ROLE_LABELS, 'Recruiting roles']) ??
        findLikelyRoleSection(documentRef);
    const roleTexts = roleSection
        ? Array.from(roleSection.querySelectorAll('label, li')).map((item) => extractRoleFromRoleRow(item))
        : [];
    return unique(roleTexts.filter((value) => Boolean(value) && !isActionText(value)));
}

function extractEssayQuestions(documentRef) {
    const questionSection = isEssayQuestionSection(documentRef)
        ? documentRef
        : findSection(documentRef, [KOREAN_ESSAY_LABEL, KOREAN_ESSAY_QUESTION_LABEL, 'Essay']) ??
            findEssayQuestionLayer(documentRef);
    if (!questionSection) {
        return [];
    }
    const structuredQuestions = Array.from(questionSection.querySelectorAll('article, li')).flatMap((item) => {
        const compactQuestions = splitCompactEssayQuestionsV2(cleanText(item.textContent));
        if (compactQuestions.length > 0) {
            return compactQuestions;
        }
        const prompt = cleanText(item.querySelector('p, strong, h3')?.textContent);
        if (!prompt) {
            return [];
        }
        return [{
            prompt,
            ...extractMaxLengthLimit(cleanText(item.textContent))
        }];
    });
    if (structuredQuestions.length > 0) {
        return structuredQuestions;
    }
    return splitCompactEssayQuestionsV2(cleanText(questionSection.textContent));
}

function isEssayQuestionSection(element) {
    return Boolean(element?.matches?.('section, article, div, [role="region"]') &&
        (element.getAttribute('aria-label')?.includes(KOREAN_ESSAY_LABEL) ||
            element.getAttribute('aria-label')?.includes(KOREAN_ESSAY_QUESTION_LABEL) ||
            element.hasAttribute('data-ezone-essay-role') ||
            hasEssayQuestionLabel(cleanText(element.querySelector('h2, h3')?.textContent))));
}

function findEssayQuestionLayer(documentRef) {
    const layerSelector = [
        '[role="dialog"]',
        '[aria-label]',
        '[class*="tooltip"]',
        '[class*="Tooltip"]',
        '[class*="popover"]',
        '[class*="Popover"]',
        '[class*="z-above"]',
        'li [class*="absolute"]',
        'tr [class*="absolute"]',
        'body > div',
        'body > section',
        'body > article'
    ].join(', ');
    return Array.from(documentRef.querySelectorAll(layerSelector))
        .find((candidate) => {
            const labelText = [
                candidate.getAttribute('aria-label'),
                cleanText(candidate.querySelector('h2, h3')?.textContent)
            ].filter(Boolean).join(' ');
            const text = cleanText(candidate.textContent) ?? '';
            const isPlainPortalLayer = candidate.parentElement === candidate.ownerDocument?.body && text.length <= 3000;
            const isFloatingLayer = candidate.matches('[role="dialog"], [class*="tooltip"], [class*="Tooltip"], [class*="popover"], [class*="Popover"]');
            const isInlineFloatingLayer = candidate.matches('[class*="z-above"], li [class*="absolute"], tr [class*="absolute"]') &&
                text.length <= 3000;
            const looksLikeRoleList = /\d+\s*명\s*작성/.test(text) && text.includes(KOREAN_ESSAY_QUESTION_VIEW);
            const looksLikeCompactQuestions = looksLikeCompactEssayTextV2(text);
            return (candidate.querySelector('article, li') || looksLikeCompactQuestions) &&
                (hasEssayQuestionLabel(labelText) ||
                    (isFloatingLayer && (hasEssayQuestionLabel(text) || looksLikeCompactQuestions)) ||
                    (isPlainPortalLayer && looksLikeCompactQuestions) ||
                    (isInlineFloatingLayer && looksLikeCompactQuestions)) &&
                (isFloatingLayer || isPlainPortalLayer || isInlineFloatingLayer || !looksLikeRoleList);
        }) ?? null;
}

function hasEssayQuestionLabel(text) {
    return Boolean(text?.includes(KOREAN_ESSAY_LABEL) || text?.includes(KOREAN_ESSAY_QUESTION_LABEL));
}

function extractRoleEssayQuestions(postingRoot, roleOptions = [], documentRef = postingRoot) {
    const stored = documentRef.__ezOneRoleEssayQuestions;
    if (stored && typeof stored === 'object') {
        return normalizeRoleEssayQuestionMap(stored);
    }

    const explicit = Array.from(postingRoot.querySelectorAll('[data-ezone-essay-role]'))
        .reduce((accumulator, section) => {
        const role = cleanText(section.getAttribute('data-ezone-essay-role'));
        const questions = extractEssayQuestions(section);
        if (role && questions.length > 0) {
            accumulator[role] = questions;
        }
        return accumulator;
    }, {});
    if (Object.keys(explicit).length > 0) {
        return normalizeRoleEssayQuestionMap(explicit);
    }

    const rows = getRoleRowCandidates(postingRoot);
    const mapped = rows.reduce((accumulator, row) => {
        const role = extractRoleFromRoleRow(row);
        const questions = extractEssayQuestions(row);
        if (role && questions.length > 0) {
            accumulator[role] = questions;
        }
        return accumulator;
    }, {});
    if (Object.keys(mapped).length > 0) {
        return normalizeRoleEssayQuestionMap(mapped);
    }

    const sharedQuestions = extractEssayQuestions(postingRoot);
    if (sharedQuestions.length === 0) {
        return {};
    }
    return roleOptions.reduce((accumulator, role) => {
        accumulator[role] = sharedQuestions;
        return accumulator;
    }, {});
}

function normalizeRoleEssayQuestionMap(source) {
    return Object.entries(source).reduce((accumulator, [role, questions]) => {
        const cleanRole = cleanText(role);
        const cleanQuestions = Array.isArray(questions)
            ? questions.filter((question) => cleanText(question?.prompt))
            : [];
        if (cleanRole && cleanQuestions.length > 0) {
            accumulator[cleanRole] = cleanQuestions;
        }
        return accumulator;
    }, {});
}

function normalizeEssayQuestionAvailability(source) {
    if (!source || typeof source !== 'object') {
        return {};
    }
    return Object.entries(source).reduce((accumulator, [role, status]) => {
        const cleanRole = cleanText(role);
        if (cleanRole && (status === 'found' || status === 'none')) {
            accumulator[cleanRole] = status;
        }
        return accumulator;
    }, {});
}

function resolveDefaultEssayQuestions(roleOptions, roleEssayQuestions, postingRoot) {
    const firstRoleQuestions = roleOptions
        .map((role) => roleEssayQuestions[role])
        .find((questions) => Array.isArray(questions) && questions.length > 0);
    return firstRoleQuestions ?? extractEssayQuestions(postingRoot);
}

function extractRoleFromEssayTrigger(candidate) {
    const row = candidate.closest('tr, li');
    if (row) {
        return extractRoleFromRoleRow(row);
    }
    return null;
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

function extractRecruitingSiteUrl(postingRoot, documentRef, sourceUrl) {
    return findRecruitingSiteUrlInRoot(postingRoot, sourceUrl) ??
        findRecruitingSiteUrlInRoot(documentRef, sourceUrl) ??
        null;
}

function findRecruitingSiteUrlInRoot(root, sourceUrl) {
    if (!root?.querySelectorAll) return null;
    const candidates = Array.from(root.querySelectorAll('a[href], button, [role="button"], [data-url], [data-href], [data-link], [data-external-url]'));
    for (const candidate of candidates) {
        if (!isRecruitingSiteLinkCandidate(candidate)) continue;
        const url = recruitingSiteUrlFromElement(candidate, sourceUrl);
        if (url && !isJasoseolUrl(url)) return url;
    }
    return null;
}

function isRecruitingSiteLinkCandidate(element) {
    const text = normalizeLinkText([
        element?.textContent,
        element?.getAttribute?.('aria-label'),
        element?.getAttribute?.('title'),
        element?.getAttribute?.('value')
    ].map((value) => cleanText(value)).filter(Boolean).join(' '));
    return text.includes(normalizeLinkText('\uCC44\uC6A9 \uC0AC\uC774\uD2B8')) ||
        text.includes(normalizeLinkText('\uCC44\uC6A9\uC0AC\uC774\uD2B8')) ||
        text.includes(normalizeLinkText('\uC9C0\uC6D0\uD558\uAE30')) ||
        text.includes('apply');
}

function recruitingSiteUrlFromElement(element, sourceUrl) {
    const linkElement = element?.closest?.('a[href]') ?? element;
    const values = [
        linkElement?.getAttribute?.('href'),
        element?.getAttribute?.('data-external-url'),
        element?.getAttribute?.('data-url'),
        element?.getAttribute?.('data-href'),
        element?.getAttribute?.('data-link'),
        element?.getAttribute?.('formaction'),
        extractUrlFromInlineHandler(element?.getAttribute?.('onclick'))
    ];
    return values
        .map((value) => absoluteHttpUrl(value, sourceUrl))
        .find(Boolean) ?? null;
}

function extractUrlFromInlineHandler(value) {
    const text = cleanText(value);
    if (!text) return null;
    const match = text.match(/https?:\/\/[^'")\s]+/i) ??
        text.match(/(?:location\.href|window\.location|open)\s*\(\s*['"]([^'"]+)['"]/i) ??
        text.match(/(?:location\.href|window\.location)\s*=\s*['"]([^'"]+)['"]/i);
    return match?.[1] ?? match?.[0] ?? null;
}

function isJasoseolUrl(value) {
    try {
        return new URL(value).hostname.endsWith('jasoseol.com');
    }
    catch {
        return false;
    }
}

function normalizeLinkText(value) {
    return (value ?? '').toString().toLowerCase().replace(/\s+/g, '');
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

function isPlainJasoseolRecruitListUrl(sourceUrl) {
    try {
        const url = new URL(sourceUrl);
        return url.hostname.endsWith('jasoseol.com') &&
            url.pathname === '/recruit' &&
            !url.searchParams.has('ec') &&
            !url.searchParams.has('campaignid');
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
    const rootText = cleanText(documentRef.textContent) ?? '';
    if (hasOnHireDeadlineText(rootText)) {
        return '채용 시 마감';
    }
    return Array.from(documentRef.querySelectorAll('time, p, span, div'))
        .map((item) => cleanText(item.textContent))
        .map((text) => text ? extractDeadlineEnd(text) : null)
        .find(Boolean) ||
        null;
}

function hasDeadlineText(text) {
    return Boolean(extractDeadlineEnd(text)) || /(\d{4}-\d{2}-\d{2}).*~/.test(text) || hasOnHireDeadlineText(text);
}

function hasOnHireDeadlineText(text) {
    return /채용\s*시\s*마감/.test(cleanText(text) ?? '');
}

function extractDeadlineEnd(text) {
    return text.match(/\d{4}년\s*\d{1,2}월\s*\d{1,2}일\s*\d{1,2}:\d{2}\s*~\s*(\d{4}년\s*\d{1,2}월\s*\d{1,2}일\s*\d{1,2}:\d{2})/)?.[1] ||
        text.match(/\d{4}-\d{2}-\d{2}[^~]{0,30}~\s*([^()]{0,60})/)?.[1]?.trim() ||
        null;
}

function normalizeDeadlineLabel(text) {
    if (!text) {
        return null;
    }
    const deadline = extractDeadlineEnd(text) || text;
    return formatDeadlineDateOnly(deadline) || deadline;
}

function formatDeadlineDateOnly(text) {
    if (!text) {
        return null;
    }
    const isoMatch = text.match(/(20\d{2})[-.](\d{1,2})[-.](\d{1,2})/);
    const koreanMatch = text.match(/(20\d{2})\s*\uB144\s*(\d{1,2})\s*\uC6D4\s*(\d{1,2})\s*\uC77C/);
    const match = isoMatch ?? koreanMatch;
    if (!match) {
        return null;
    }
    return [
        match[1],
        match[2].padStart(2, '0'),
        match[3].padStart(2, '0')
    ].join('.');
}

function extractModalTableRoles(documentRef) {
    return unique(getRoleRowCandidates(documentRef).flatMap((row) => {
        const role = extractRoleFromRoleRow(row);
        return role ? [role] : [];
    }));
}

function extractRoleFromRoleRow(row) {
    const cells = Array.from(row.querySelectorAll('td, th'))
        .map((cell) => cleanText(cell.textContent))
        .filter(Boolean);
    const rowText = cleanText(row.textContent);
    if (cells.length >= 2) {
        const employmentType = extractEmploymentTypeFromCells(cells) ?? extractEmploymentTypeFromText(rowText);
        const role = cells.find(isRoleText) ?? parseRoleFromRowText(rowText);
        return formatRoleOption(role, employmentType);
    }
    const explicit = Array.from(row.querySelectorAll('[data-ezone-role], strong, b'))
        .map((item) => cleanText(item.textContent))
        .find(isRoleText);
    const employmentType = extractEmploymentTypeFromText(rowText);
    return formatRoleOption(explicit ?? parseRoleFromRowText(rowText), employmentType);
}

function formatRoleOption(role, employmentType) {
    const cleanRole = cleanText(role);
    const cleanEmploymentType = normalizeEmploymentType(employmentType);
    if (!cleanRole) {
        return null;
    }
    if (!cleanEmploymentType || cleanRole.startsWith(`${cleanEmploymentType} · `)) {
        return cleanRole;
    }
    return `${cleanEmploymentType} · ${cleanRole}`;
}

function extractEmploymentTypeFromCells(cells) {
    return cells.map(extractEmploymentTypeFromText).find(Boolean) ?? null;
}

function extractEmploymentTypeFromText(text) {
    const value = cleanText(text) ?? '';
    const exact = normalizeEmploymentType(value);
    if (exact) {
        return exact;
    }
    return normalizeEmploymentType(value.match(/^(신입\s*\/\s*경력|신입·경력|신입∕경력|계약직|인턴|신입|경력)\s*/u)?.[1]);
}

function normalizeEmploymentType(text) {
    const value = (cleanText(text) ?? '').normalize('NFKC').replace(/\s+/g, '');
    if (/^신입\/경력$|^신입·경력$|^신입∕경력$/u.test(value)) {
        return '신입/경력';
    }
    if (value === '신입' || value === '경력' || value === '인턴' || value === '계약직') {
        return value;
    }
    return null;
}

function getRoleRowCandidates(root) {
    return Array.from(root.querySelectorAll('tr, li')).filter((row) => {
        const text = cleanText(row.textContent) ?? '';
        return /\d+\s*명\s*작성/.test(text) ||
            hasEssayActionText(getElementSearchText(row));
    });
}

function isRoleText(text) {
    return Boolean(text) &&
        text.length >= 2 &&
        !isEmploymentTypeText(text) &&
        !/\d+\s*명\s*작성/.test(text) &&
        !isActionText(text);
}

function parseRoleFromRowText(text) {
    if (!text) {
        return null;
    }
    const cleaned = stripEssayQuestionTail(text)
        .replace(KOREAN_ESSAY_WRITE, '')
        .replace(KOREAN_ESSAY_CREATE, '')
        .replace(KOREAN_ESSAY_QUESTION_VIEW, '')
        .replace(/\uB098\uC911\uC5D0\s*\uC4F8\s*(?:\uC790\uAE30\uC18C\uAC1C\uC11C|\uC790\uC18C\uC11C)\uB85C\s*\uCD94\uAC00.*$/g, '')
        .replace(/\d+\s*\uBA85\s*\uC791\uC131/g, '')
        .replace(/\d+\s*명\s*작성/g, '')
        .replace(/^(신입\s*\/\s*경력|신입·경력|신입∕경력|계약직|인턴|신입|경력)\s*/, '')
        .trim();
    return isRoleText(cleaned) ? cleaned : null;
}

function stripEssayQuestionTail(text) {
    if (!text) {
        return '';
    }
    const numberedEssayBoundary = text.search(/[·•ㆍ・]\s*\d{1,2}\.\s*/);
    if (numberedEssayBoundary >= 0) {
        return text.slice(0, numberedEssayBoundary);
    }
    const essayBoundary = text.search(/[·•ㆍ・][^·•ㆍ・]{8,}?(?:\d{2,5}\s*\uC790|\uC11C\uC220|\uAE30\uC220|\uC791\uC131|\uC124\uBA85|\uC18C\uAC1C|\uAC15\uC810|\uC9C0\uC6D0|\uACBD\uD5D8)/);
    return essayBoundary >= 0 ? text.slice(0, essayBoundary) : text;
}

function isActionText(text) {
    return hasEssayActionText(text) ||
        /\uC81C\uCD9C\s*\uC11C\uB958\s*\uBC1B\uAE30|\uACF5\uACE0\s*\uACF5\uC720|\uC990\uACA8\uCC3E\uAE30|\uC624\uB958\s*\uC2E0\uACE0|\uCC44\uC6A9\s*\uC0AC\uC774\uD2B8/.test(text);
}

function isEmploymentTypeText(text) {
    return Boolean(normalizeEmploymentType(text));
}

function extractMaxLength(text) {
    return extractMaxLengthLimit(text).maxLength;
}

function extractMaxLengthLimit(text) {
    if (!text) {
        return { maxLength: null, maxLengthUnit: null };
    }
    const byteMatch = text.match(limitPattern('byte'));
    if (byteMatch) {
        return {
            maxLength: parseLimitNumber(byteMatch[1] ?? byteMatch[2]),
            maxLengthUnit: 'byte'
        };
    }
    const charMatch = text.match(limitPattern('자'));
    if (charMatch) {
        return {
            maxLength: parseLimitNumber(charMatch[1] ?? charMatch[2]),
            maxLengthUnit: 'char'
        };
    }
    const fallback = text.match(/(\d{2,5})/);
    return {
        maxLength: fallback ? Number(fallback[1]) : null,
        maxLengthUnit: fallback ? 'char' : null
    };
}

function limitPattern(unit) {
    const numberPattern = '(\\d{1,3}(?:,\\d{3})+|\\d{2,5})';
    return new RegExp(`\\(${numberPattern}\\s*${unit}\\)|${numberPattern}\\s*${unit}`, 'i');
}

function parseLimitNumber(value) {
    const parsed = Number(String(value ?? '').replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
}

function looksLikeCompactEssayText(text) {
    return Boolean(text && /(?:^|\s|·|•)\d{1,2}\.\s*\S/.test(text));
}

function splitCompactEssayQuestions(text) {
    if (!looksLikeCompactEssayText(text)) {
        return [];
    }
    const normalized = text
        .replace(/나중에\s*쓸\s*(?:자기소개서|자소서)로\s*추가.*/g, ' ')
        .replaceAll(KOREAN_ESSAY_QUESTION_LABEL, ' ')
        .replaceAll(KOREAN_ESSAY_LABEL, ' ')
        .replaceAll(KOREAN_SHORT_ESSAY_LABEL, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return normalized
        .split(/(?:^|[·•]\s*)\d{1,2}\.\s*/)
        .slice(1)
        .map((chunk) => {
            const cleanChunk = chunk.trim();
            const maxLengthLimit = extractMaxLengthLimit(cleanChunk);
            const prompt = cleanText(cleanChunk
                .replace(limitTextPattern(), '')
                .replace(limitTextTailPattern(), ''));
            return prompt ? { prompt, ...maxLengthLimit } : null;
        })
        .filter(Boolean);
}

function looksLikeCompactEssayTextV2(text) {
    return Boolean(text && (hasNumberedEssayDelimiter(text) || hasQuestionLabelDelimiter(text) || hasLooseEssayDelimiter(text)));
}

function splitCompactEssayQuestionsV2(text) {
    if (!looksLikeCompactEssayTextV2(text)) {
        return [];
    }
    const normalized = text
        .replace(/\uB098\uC911\uC5D0\s*\uC4F8\s*(?:\uC790\uAE30\uC18C\uAC1C\uC11C|\uC790\uC18C\uC11C)\uB85C\s*\uCD94\uAC00.*$/g, ' ')
        .replaceAll(KOREAN_ESSAY_QUESTION_LABEL, ' ')
        .replaceAll(KOREAN_ESSAY_LABEL, ' ')
        .replaceAll(KOREAN_SHORT_ESSAY_LABEL, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const chunks = splitCompactEssayChunks(normalized);
    return chunks
        .map((chunk) => {
            const cleanChunk = chunk
                .replace(/^\d{1,2}\.\s*/, '')
                .replace(/^문항\s*\d{1,2}\s*/u, '')
                .replace(/^\d{2,5}\s*자\s*/u, '')
                .trim();
            const maxLengthLimit = extractMaxLengthLimit(cleanChunk);
            const prompt = cleanText(cleanChunk
                .replace(limitTextPattern(), '')
                .replace(limitTextTailPattern(), '')
                .replace(/\s+/g, ' '));
            return prompt ? { prompt, ...maxLengthLimit } : null;
        })
        .filter(Boolean);
}

function splitCompactEssayChunks(text) {
    const numberedMatches = Array.from(text.matchAll(/(?:^|[·•ㆍ・]\s*|\s+)(\d{1,2}\.\s*)/g));
    if (numberedMatches.length > 0) {
        return numberedMatches.map((match, index) => {
            const start = (match.index ?? 0) + match[0].length - match[1].length;
            const end = index + 1 < numberedMatches.length ? numberedMatches[index + 1].index : text.length;
            return text.slice(start, end).replace(/\s*[·•ㆍ・]\s*$/g, '').trim();
        }).filter(Boolean);
    }
    const questionLabelMatches = Array.from(text.matchAll(/(?:^|\s+)(문항\s*\d{1,2}\s*)/gu));
    if (questionLabelMatches.length > 0) {
        return questionLabelMatches.map((match, index) => {
            const start = (match.index ?? 0) + match[0].length - match[1].length;
            const end = index + 1 < questionLabelMatches.length ? questionLabelMatches[index + 1].index : text.length;
            return text.slice(start, end).trim();
        }).filter(Boolean);
    }
    return text.split(/\s*[·•ㆍ・](?=\s)\s*/).slice(1);
}

function limitTextPattern() {
    return /\(\s*(?:\d{1,3}(?:,\d{3})+|\d{2,5})\s*(?:\uC790|byte)\s*(?:\uC774\uB0B4|\uB0B4\uC678)?\s*\)/gi;
}

function limitTextTailPattern() {
    return /\s*\(?(?:\d{1,3}(?:,\d{3})+|\d{2,5})\s*(?:\uC790|byte)\s*(?:\uC774\uB0B4|\uB0B4\uC678)?\)?\s*$/gi;
}

function hasNumberedEssayDelimiter(text) {
    return /(?:^|[·•ㆍ・]\s*|\s+)\d{1,2}\.\s*\S/.test(text);
}

function hasQuestionLabelDelimiter(text) {
    return /(?:^|\s+)문항\s*\d{1,2}\s*\S/u.test(text);
}

function hasLooseEssayDelimiter(text) {
    return /[·•ㆍ・](?=\s)\s*\S/.test(text);
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
                .map((employment) => {
                    const record = asRecord(employment);
                    return formatRoleOption(readString(record, 'field'), readEmploymentType(record));
                })
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

function readEmploymentType(source) {
    return [
        'employmentType',
        'employment_type',
        'careerType',
        'career_type',
        'career',
        'type',
        'jobType',
        'job_type'
    ].map((key) => readString(source, key))
        .map(normalizeEmploymentType)
        .find(Boolean) ?? null;
}

function asRecord(value) {
    return value && typeof value === 'object' ? value : null;
}

window.ezOneExtractJobPosting = (options = {}) => {
    if (options.withEssayQuestions) {
        return extractJobPostingWithInteractions(document, document.location.href, options);
    }
    return extractJobPosting(document, document.location.href);
};
window.ezOneJobExtractorVersion = JOB_EXTRACTOR_VERSION;
if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage && !window.ezOneJobExtractorListenerReady) {
    window.ezOneJobExtractorListenerReady = true;
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
        if (message?.type !== 'EZONE_EXTRACT_JOB') {
            return false;
        }
        extractJobPostingWithInteractions()
            .then((posting) => sendResponse(posting))
            .catch(() => sendResponse(extractJobPosting()));
        return true;
    });
}
