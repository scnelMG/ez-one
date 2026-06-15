import { createExtensionJobApi } from '../shared/api/extensionJobApi';
import { createExtensionDocumentProfileApi } from '../shared/api/extensionDocumentProfileApi';
import {
    ACCESS_TOKEN_KEY,
    REFRESH_TOKEN_KEY,
    buildWebLoginUrl,
    clearStoredSession,
    getStoredSession,
    saveStoredSession
} from '../shared/auth/extensionAuth';
import './popup.css';

const apiBaseUrl = import.meta.env.VITE_EXTENSION_API_BASE_URL ?? 'http://localhost:8080/api';
const webAppUrl = import.meta.env.VITE_EXTENSION_WEB_APP_URL ?? 'http://localhost:5173';
const AUTH_EXPIRED_MESSAGE = '\uB85C\uADF8\uC778\uC774 \uB9CC\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4';
const UNSUPPORTED_JOB_PAGE_MESSAGE = '저장하려는 자소설닷컴 공고 상세 화면에서 EZ-ONE을 실행해 주세요.';
const JOB_EXTRACTOR_VERSION = '2026-06-12-role-essay-v11';
const POSTING_WATCH_INTERVAL_MS = 1200;
const statusPanel = requireElement('status-panel');
const loginPanel = requireElement('login-panel');
const featurePanel = requireElement('feature-panel');
const previewPanel = requireElement('preview-panel');
const resultPanel = requireElement('result-panel');
const documentResultPanel = requireElement('document-result-panel');
const statusTitle = requireElement('status-title');
const statusMessage = requireElement('status-message');
const loginButton = requireElement('login-button');
const jobSaveModeButton = requireElement('job-save-mode-button');
const documentInputModeButton = requireElement('document-input-mode-button');
const saveButton = requireElement('save-button');
const reloadPreviewButton = requireElement('reload-preview-button');
const saveAnotherButton = requireElement('save-another-button');
const companyNameInput = requireElement('company-name-input');
const positionTitleInput = requireElement('position-title-input');
const deadlineLabelInput = requireElement('deadline-label-input');
const essayQuestionList = requireElement('essay-question-list');
const essayQuestionStatus = requireElement('essay-question-status');
const roleOptions = requireElement('role-options');
const roleCount = requireElement('role-count');
const basketLink = requireElement('basket-link');
const savedJobList = requireElement('saved-job-list');
const autofillSummary = requireElement('autofill-summary');
const autofillFilledList = requireElement('autofill-filled-list');
const autofillFailedList = requireElement('autofill-failed-list');
const autofillCopyList = requireElement('autofill-copy-list');
let currentPosting = null;
let activeEssayRole = null;
let essayQuestionRequestId = 0;
let waitingForWebLogin = false;
let hasExtensionSession = false;
let isReadingPreview = false;
let isSavingJob = false;
let lastObservedPostingUrl = null;
let postingWatchTimer = null;
const contentScriptLoadPromises = new Map();

const jobApi = createExtensionJobApi({
    apiBaseUrl,
    getAccessToken: getStoredAccessToken,
    getRefreshToken: getStoredRefreshToken,
    saveSession: saveRefreshedSession,
    clearSession: clearExtensionSession
});
const documentProfileApi = createExtensionDocumentProfileApi({
    apiBaseUrl,
    getAccessToken: getStoredAccessToken,
    getRefreshToken: getStoredRefreshToken,
    saveSession: saveRefreshedSession,
    clearSession: clearExtensionSession
});

setStaticLinks();
chrome.storage.onChanged?.addListener(handleSessionStorageChanged);
loginButton.addEventListener('click', async () => {
    const tab = await getActiveTab();
    const loginUrl = buildWebLoginUrl({
        webAppUrl,
        currentUrl: tab.url ?? '',
        sourceTabId: tab.id
    });
    waitingForWebLogin = true;
    await chrome.tabs.create({ url: loginUrl.toString() });
    setStatus('Google 로그인을 완료하면 자동으로 이어집니다.');
});
jobSaveModeButton.addEventListener('click', () => {
    void loadPreview({ showUnsupportedMessage: true });
});
documentInputModeButton.addEventListener('click', () => {
    void runDocumentAutoFill();
});
reloadPreviewButton.addEventListener('click', () => {
    void loadPreview({ force: true, showUnsupportedMessage: true });
});
saveAnotherButton.addEventListener('click', () => {
    void loadPreview({ force: true, showUnsupportedMessage: true });
});
saveButton.addEventListener('click', async () => {
    if (!currentPosting) {
        return;
    }
    const selectedRoles = Array.from(roleOptions.querySelectorAll('input:checked'))
        .map((item) => item.value);
    if (selectedRoles.length === 0) {
        setStatus('저장할 직무를 하나 이상 선택해 주세요.', true);
        return;
    }
    try {
        isSavingJob = true;
        saveButton.disabled = true;
        saveButton.textContent = '저장 중';
        const savedJobs = await jobApi.save({
            ...currentPosting,
            companyName: normalizeInput(companyNameInput.value),
            positionTitle: normalizeInput(positionTitleInput.value),
            deadlineLabel: normalizeInput(deadlineLabelInput.value),
            essayQuestions: collectEssayQuestions(),
            roleEssayQuestions: buildRoleEssayQuestionsPayload(selectedRoles),
            selectedRoles
        });
        const firstWorkspaceId = savedJobs[0]?.workspaceId;
        basketLink.href = `${webAppUrl}/basket`;
        requireElement('result-message').textContent = firstWorkspaceId
            ? '선택한 직무가 저장되었습니다. 다른 공고를 열면 자동으로 다시 읽습니다.'
            : '이미 저장된 공고입니다. 다른 공고를 열면 자동으로 다시 읽습니다.';
        renderSavedJobs(savedJobs, currentPosting);
        showPanel(resultPanel);
    }
    catch (error) {
        if (await handleAuthExpired(error)) {
            return;
        }
        setStatus(error instanceof Error ? error.message : '저장에 실패했습니다.', true);
    }
    finally {
        isSavingJob = false;
        saveButton.disabled = false;
        saveButton.textContent = '선택한 공고 장바구니에 담기';
    }
});

void init();
startPostingChangeWatcher();

async function init() {
    const session = await getStoredSession(chrome.storage.local);
    if (!session) {
        hasExtensionSession = false;
        showPanel(loginPanel);
        return;
    }
    hasExtensionSession = true;
    await loadPreview({ fallbackPanel: featurePanel });
}

async function handleSessionStorageChanged(changes, areaName) {
    if (!waitingForWebLogin || areaName !== 'local' || !hasSessionTokenChange(changes)) {
        return;
    }
    const session = await getStoredSession(chrome.storage.local);
    if (!session) {
        return;
    }
    waitingForWebLogin = false;
    hasExtensionSession = true;
    await loadPreview({ fallbackPanel: featurePanel });
}

function hasSessionTokenChange(changes) {
    return Boolean(changes?.[ACCESS_TOKEN_KEY] || changes?.[REFRESH_TOKEN_KEY]);
}

async function loadPreview(options = {}) {
    if (isReadingPreview && !options.force) {
        return;
    }
    try {
        isReadingPreview = true;
        const tab = await getActiveTab();
        lastObservedPostingUrl = tab.url ?? lastObservedPostingUrl;
        if (!tab.id) {
            setStatus('현재 탭을 찾지 못했습니다.', true);
            return;
        }
        if (!isSupportedJobPostingPage(tab.url)) {
            if (options.fallbackPanel) {
                showPanel(options.fallbackPanel);
                return;
            }
            if (options.showUnsupportedMessage ?? true) {
                setStatus(UNSUPPORTED_JOB_PAGE_MESSAGE, true);
            }
            return;
        }
        setStatus(options.statusMessage ?? '현재 페이지에서 공고 정보를 읽고 있습니다.');
        const posting = await extractCurrentTabPosting(tab.id);
        currentPosting = posting;
        await jobApi.preview(posting);
        renderPosting(posting);
        showPanel(previewPanel);
        void loadEssayQuestionsForSelectedRole();
    }
    catch (error) {
        if (await handleAuthExpired(error)) {
            return;
        }
        setStatus(error instanceof Error ? error.message : '공고 정보를 추출하지 못했습니다.', true);
    }
    finally {
        isReadingPreview = false;
    }
}

function startPostingChangeWatcher() {
    if (postingWatchTimer || !chrome.tabs?.query) {
        return;
    }
    postingWatchTimer = setInterval(() => {
        void refreshPreviewWhenPostingChanges();
    }, POSTING_WATCH_INTERVAL_MS);
}

async function refreshPreviewWhenPostingChanges() {
    if (!hasExtensionSession || waitingForWebLogin || isReadingPreview || isSavingJob || !loginPanel.hidden || !documentResultPanel.hidden) {
        return;
    }
    try {
        const tab = await getActiveTab();
        const currentUrl = tab.url ?? '';
        if (!isSupportedJobPostingPage(currentUrl) || currentUrl === lastObservedPostingUrl) {
            return;
        }
        lastObservedPostingUrl = currentUrl;
        await loadPreview({
            force: true,
            showUnsupportedMessage: false,
            statusMessage: '새 공고를 읽고 있습니다.'
        });
    }
    catch {
        // Keep the current panel stable when Chrome briefly cannot report the active tab.
    }
}

function isSupportedJobPostingPage(url) {
    if (!url) {
        return false;
    }
    try {
        const parsedUrl = new URL(url);
        if (!parsedUrl.hostname.endsWith('jasoseol.com')) {
            return false;
        }
        return parsedUrl.pathname.startsWith('/recruit/') ||
            parsedUrl.searchParams.has('campaignid') ||
            parsedUrl.searchParams.has('ec');
    } catch {
        return false;
    }
}

async function extractCurrentTabPosting(tabId) {
    await ensureContentScriptLoaded(tabId, 'assets/jobExtractor.js', () => window.ezOneJobExtractorVersion === JOB_EXTRACTOR_VERSION);
    const [result] = await chrome.scripting.executeScript({
        target: { tabId },
        func: async () => await window.ezOneExtractJobPosting?.() ?? null
    });
    if (!result?.result) {
        throw new Error(UNSUPPORTED_JOB_PAGE_MESSAGE);
    }
    return result.result;
}

async function extractEssayQuestionsForRole(tabId, role) {
    await ensureContentScriptLoaded(tabId, 'assets/jobExtractor.js', () => window.ezOneJobExtractorVersion === JOB_EXTRACTOR_VERSION);
    const [result] = await chrome.scripting.executeScript({
        target: { tabId },
        func: async (targetRole) => await window.ezOneExtractJobPosting?.({
            withEssayQuestions: true,
            targetRoles: [targetRole],
            hoverDelayMs: 50,
            maxEssayTriggers: 1
        }) ?? null,
        args: [role]
    });
    return result?.result ?? null;
}

async function runDocumentAutoFill() {
    try {
        setStatus('현재 페이지의 입력칸을 감지하고 있습니다.');
        const tab = await getActiveTab();
        if (!tab.id) {
            setStatus('현재 탭을 찾지 못했습니다.', true);
            return;
        }
        const profile = await documentProfileApi.getDocumentProfile();
        await ensureContentScriptLoaded(tab.id, 'assets/applicationAutoFill.js', () => Boolean(window.ezOneAutoFillApplicationLoaded));
        const result = await chrome.tabs.sendMessage(tab.id, {
            type: 'EZONE_AUTOFILL_APPLICATION',
            profile
        });
        renderAutoFillResult(result);
        showPanel(documentResultPanel);
    }
    catch (error) {
        if (await handleAuthExpired(error)) {
            return;
        }
        setStatus(error instanceof Error ? error.message : '서류 정보 자동 입력에 실패했습니다.', true);
    }
}

async function ensureContentScriptLoaded(tabId, file, isLoaded) {
    const loadKey = `${tabId}:${file}`;
    if (contentScriptLoadPromises.has(loadKey)) {
        await contentScriptLoadPromises.get(loadKey);
        return;
    }
    const loadPromise = loadContentScript(tabId, file, isLoaded)
        .finally(() => contentScriptLoadPromises.delete(loadKey));
    contentScriptLoadPromises.set(loadKey, loadPromise);
    await loadPromise;
}

async function loadContentScript(tabId, file, isLoaded) {
    const [loaded] = await chrome.scripting.executeScript({
        target: { tabId },
        func: isLoaded
    });
    if (loaded?.result) {
        return;
    }
    await chrome.scripting.executeScript({
        target: { tabId },
        files: [file]
    });
}

function renderPosting(posting) {
    activeEssayRole = null;
    essayQuestionRequestId += 1;
    companyNameInput.value = posting.companyName ?? '';
    positionTitleInput.value = posting.positionTitle ?? '';
    deadlineLabelInput.value = posting.deadlineLabel ?? '';
    const roles = posting.roleOptions.length > 0
        ? posting.roleOptions
        : [posting.positionTitle ?? '선택 직무'];
    roleCount.textContent = `${roles.length}개`;
    roleOptions.replaceChildren(...roles.map((role, index) => {
        const label = document.createElement('label');
        const input = document.createElement('input');
        const labelText = document.createElement('span');
        const parsedRole = parseDisplayRole(role);
        input.type = 'checkbox';
        input.value = role;
        input.checked = index === 0;
        if (input.checked) {
            activeEssayRole = role;
        }
        input.addEventListener('change', () => {
            updateEssayQuestionsForSelectedRoles(role);
            if (input.checked) {
                void loadEssayQuestionsForSelectedRole(role);
            }
        });
        labelText.className = 'role-option-text';
        if (parsedRole.employmentType) {
            const badge = document.createElement('span');
            const title = document.createElement('span');
            labelText.classList.add('role-option-text--with-badge');
            badge.className = 'role-employment-badge';
            badge.classList.add(getEmploymentBadgeClass(parsedRole.employmentType));
            title.className = 'role-title';
            badge.textContent = parsedRole.employmentType;
            title.textContent = parsedRole.title;
            labelText.append(badge, title);
        }
        else {
            labelText.classList.add('role-option-text--plain');
            labelText.textContent = parsedRole.title;
        }
        label.append(input, labelText);
        return label;
    }));
    updateEssayQuestionsForSelectedRoles();
}

function parseDisplayRole(role) {
    const text = normalizeInput(role) ?? '';
    const match = text.match(/^(신입\/경력|신입|경력|인턴|계약직)\s*·\s*(.+)$/);
    if (!match) {
        return { employmentType: null, title: text };
    }
    return {
        employmentType: match[1],
        title: match[2]
    };
}

function getEmploymentBadgeClass(employmentType) {
    switch (employmentType) {
        case '신입':
            return 'role-employment-badge--new';
        case '경력':
            return 'role-employment-badge--career';
        case '신입/경력':
            return 'role-employment-badge--mixed';
        case '계약직':
            return 'role-employment-badge--contract';
        case '인턴':
            return 'role-employment-badge--intern';
        default:
            return 'role-employment-badge--default';
    }
}

async function loadEssayQuestionsForSelectedRole(role = activeEssayRole) {
    if (!currentPosting || !role) {
        return;
    }
    if (Array.isArray(currentPosting.roleEssayQuestions?.[role]) && currentPosting.roleEssayQuestions[role].length > 0) {
        updateEssayQuestionsForSelectedRoles(role);
        return;
    }
    const requestId = ++essayQuestionRequestId;
    renderEssayQuestionLoading(role);
    try {
        const tab = await getActiveTab();
        if (!tab.id) {
            return;
        }
        const posting = await extractEssayQuestionsForRole(tab.id, role);
        if (requestId !== essayQuestionRequestId || !posting) {
            return;
        }
        currentPosting = {
            ...currentPosting,
            essayQuestions: (posting.essayQuestions ?? []).length > 0
                ? posting.essayQuestions
                : currentPosting.essayQuestions ?? [],
            roleEssayQuestions: {
                ...(currentPosting.roleEssayQuestions ?? {}),
                ...(posting.roleEssayQuestions ?? {})
            },
            essayQuestionAvailability: {
                ...(currentPosting.essayQuestionAvailability ?? {}),
                ...(posting.essayQuestionAvailability ?? {})
            }
        };
        updateEssayQuestionsForSelectedRoles(role);
    }
    catch {
        if (requestId === essayQuestionRequestId) {
            renderEssayQuestionStatus(null, [], getSelectedRoles());
        }
    }
}

function normalizeInput(value) {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function updateEssayQuestionsForSelectedRoles(changedRole = null) {
    if (!currentPosting) {
        return;
    }
    const selectedRoles = getSelectedRoles();
    const roleQuestionMap = currentPosting.roleEssayQuestions ?? {};
    if (changedRole && selectedRoles.includes(changedRole)) {
        activeEssayRole = changedRole;
    }
    activeEssayRole = selectedRoles.includes(activeEssayRole) ? activeEssayRole : selectedRoles[0] ?? null;
    const matchedRole = selectedRoles.find((role) => role === activeEssayRole && Array.isArray(roleQuestionMap[role]) && roleQuestionMap[role].length > 0) ??
        selectedRoles.find((role) => Array.isArray(roleQuestionMap[role]) && roleQuestionMap[role].length > 0);
    activeEssayRole = matchedRole ?? activeEssayRole;
    const questions = matchedRole
        ? roleQuestionMap[matchedRole]
        : currentPosting.essayQuestions ?? [];
    const selectedRoleAvailability = activeEssayRole
        ? currentPosting.essayQuestionAvailability?.[activeEssayRole]
        : null;
    const hasNoEssayQuestions = !matchedRole && selectedRoleAvailability === 'none' && questions.length === 0;
    renderEssayQuestionInputs(questions, { showFallback: !hasNoEssayQuestions });
    renderEssayQuestionStatus(matchedRole, questions, selectedRoles, hasNoEssayQuestions);
}

function renderEssayQuestionLoading(role) {
    essayQuestionList.replaceChildren();
    essayQuestionStatus.textContent = `"${role}" 자소서 문항을 확인하고 있습니다.`;
    essayQuestionStatus.classList.remove('is-warning');
}

function renderEssayQuestionInputs(questions = [], options = {}) {
    const showFallback = options.showFallback ?? true;
    const validQuestions = questions
        .map((question) => ({
        prompt: normalizeInput(question?.prompt ?? ''),
        maxLength: Number.isFinite(Number(question?.maxLength)) ? Number(question.maxLength) : null
    }))
        .filter((question) => question.prompt);
    const items = validQuestions.length > 0
        ? validQuestions
        : showFallback ? [{ prompt: '', maxLength: null }] : [];
    essayQuestionList.replaceChildren(...items.map(createEssayQuestionInput));
}

function createEssayQuestionInput(question, index) {
    const item = document.createElement('details');
    const summary = document.createElement('summary');
    const header = document.createElement('span');
    const title = document.createElement('strong');
    const meta = document.createElement('small');
    const action = document.createElement('span');
    const preview = document.createElement('span');
    const textarea = document.createElement('textarea');
    const hasPrompt = Boolean(question.prompt);

    item.className = 'essay-question-item';
    item.open = !hasPrompt;
    summary.className = 'essay-question-summary';
    header.className = 'essay-question-item-header';
    action.className = 'essay-question-action';
    action.setAttribute('aria-hidden', 'true');
    title.textContent = `문항 ${index + 1}`;
    meta.textContent = question.maxLength ? `${question.maxLength}자` : '글자 수 제한 없음';
    preview.className = 'essay-question-preview';
    preview.textContent = hasPrompt ? question.prompt : '문항을 직접 입력하세요.';
    textarea.className = 'essay-question-input';
    textarea.setAttribute('data-max-length', question.maxLength ? String(question.maxLength) : '');
    textarea.rows = getEssayQuestionRows(question.prompt);
    textarea.placeholder = '자소서 문항을 입력하세요.';
    textarea.value = question.prompt;
    item.addEventListener('toggle', () => {
        if (!item.open) {
            return;
        }
        requestAnimationFrame(() => {
            item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        });
    });

    title.append(meta);
    header.append(title, action);
    summary.append(header, preview);
    item.append(summary, textarea);
    return item;
}

function getEssayQuestionRows(prompt) {
    if (prompt.length > 260) {
        return 8;
    }
    if (prompt.length > 160) {
        return 6;
    }
    return 4;
}

function buildRoleEssayQuestionsPayload(selectedRoles) {
    const source = currentPosting?.roleEssayQuestions ?? {};
    const payload = selectedRoles.reduce((accumulator, role) => {
        if (Array.isArray(source[role])) {
            accumulator[role] = source[role];
        }
        return accumulator;
    }, {});
    if (activeEssayRole && selectedRoles.includes(activeEssayRole)) {
        payload[activeEssayRole] = collectEssayQuestions();
    }
    return payload;
}

function getSelectedRoles() {
    return Array.from(roleOptions.querySelectorAll('input:checked'))
        .map((item) => item.value);
}

function renderLegacyEssayQuestionStatus(matchedRole, questions, selectedRoles) {
    if (matchedRole && questions.length > 0) {
        essayQuestionStatus.textContent = `"${matchedRole}" 기준 자소서 문항 ${questions.length}개를 가져왔습니다. 직무 선택을 바꾸면 문항도 함께 바뀝니다.`;
        essayQuestionStatus.classList.remove('is-warning');
        return;
    }
    if ((currentPosting?.essayQuestions ?? []).length > 0) {
        essayQuestionStatus.textContent = `공통 자소서 문항 ${questions.length}개를 가져왔습니다. 직무별 문항을 찾지 못하면 이 문항을 사용합니다.`;
        essayQuestionStatus.classList.remove('is-warning');
        return;
    }
    const roleLabel = selectedRoles[0] ? `"${selectedRoles[0]}" ` : '';
    essayQuestionStatus.textContent = `${roleLabel}자소서 문항을 자동으로 확인하지 못했습니다. 아래에 직접 입력하면 저장됩니다.`;
    essayQuestionStatus.classList.add('is-warning');
}

function renderEssayQuestionStatus(matchedRole, questions, selectedRoles, hasNoEssayQuestions = false) {
    if (matchedRole && questions.length > 0) {
        essayQuestionStatus.textContent = `${questions.length}개 문항을 가져왔습니다. 문항을 눌러 내용을 확인하거나 수정할 수 있습니다.`;
        essayQuestionStatus.classList.remove('is-warning');
        return;
    }
    if (hasNoEssayQuestions) {
        const roleLabel = selectedRoles[0] ? `"${selectedRoles[0]}" ` : '';
        essayQuestionStatus.textContent = `${roleLabel}자소서 문항이 없는 공고입니다. 저장할 때 자소서 문항 없이 진행됩니다.`;
        essayQuestionStatus.classList.remove('is-warning');
        return;
    }
    if ((currentPosting?.essayQuestions ?? []).length > 0) {
        essayQuestionStatus.textContent = `공통 자소서 문항 ${questions.length}개를 가져왔습니다. 직무별 문항을 찾지 못하면 이 문항을 사용합니다.`;
        essayQuestionStatus.classList.remove('is-warning');
        return;
    }
    const roleLabel = selectedRoles[0] ? `"${selectedRoles[0]}" ` : '';
    essayQuestionStatus.textContent = `${roleLabel}자소서 문항을 자동으로 확인하지 못했습니다. 아래에 직접 입력하면 저장됩니다.`;
    essayQuestionStatus.classList.add('is-warning');
}

function collectEssayQuestions() {
    return Array.from(essayQuestionList.querySelectorAll('.essay-question-input'))
        .map((input) => ({
        prompt: normalizeInput(input.value),
        maxLength: normalizeMaxLength(input.getAttribute('data-max-length'))
    }))
        .filter((question) => question.prompt)
        .map((question) => ({
        prompt: question.prompt,
        maxLength: question.maxLength
    }));
}

function normalizeMaxLength(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function renderSavedJobs(savedJobs, posting) {
    const items = savedJobs.length > 0
        ? savedJobs
        : [{ companyName: posting.companyName, positionTitle: posting.positionTitle }];
    savedJobList.replaceChildren(...items.map((job) => {
        const item = document.createElement('li');
        const company = document.createElement('span');
        const title = document.createElement('strong');
        company.textContent = job.companyName ?? posting.companyName ?? '회사 확인 필요';
        title.textContent = job.positionTitle ?? posting.positionTitle ?? '공고 확인 필요';
        item.append(company, title);
        return item;
    }));
}

function renderAutoFillResult(result) {
    const filled = Array.isArray(result?.filled) ? result.filled : [];
    const failed = Array.isArray(result?.failed) ? result.failed : [];
    const copyCandidates = Array.isArray(result?.copyCandidates) ? result.copyCandidates : [];
    autofillSummary.textContent = `${filled.length}개 항목을 자동 입력했고 ${failed.length}개 항목은 확인이 필요합니다. 제출 전에는 반드시 직접 검토하세요.`;
    renderResultList(autofillFilledList, filled, (item) => ({
        title: item.label ?? item.fieldKey,
        body: item.value
    }), '자동 입력된 항목이 없습니다.');
    renderResultList(autofillFailedList, failed, (item) => ({
        title: item.label ?? '알 수 없는 입력칸',
        body: item.reason === 'essay_or_long_text' ? '자기소개서 또는 장문 입력칸은 자동 입력하지 않았습니다.' : '매칭되는 서류 정보를 찾지 못했습니다.'
    }), '실패 항목이 없습니다.');
    renderResultList(autofillCopyList, copyCandidates.slice(0, 8), (item) => ({
        title: item.label,
        body: item.value
    }), '복사 가능한 후보가 없습니다.');
}

function renderResultList(list, items, mapper, emptyText) {
    if (items.length === 0) {
        const item = document.createElement('li');
        item.textContent = emptyText;
        list.replaceChildren(item);
        return;
    }
    list.replaceChildren(...items.map((source) => {
        const mapped = mapper(source);
        const item = document.createElement('li');
        const title = document.createElement('strong');
        const body = document.createElement('span');
        title.textContent = mapped.title ?? '';
        body.textContent = mapped.body ?? '';
        item.append(title, body);
        return item;
    }));
}

async function getActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
        throw new Error('현재 탭을 찾지 못했습니다.');
    }
    return tab;
}

async function getStoredAccessToken() {
    const values = await chrome.storage.local.get([ACCESS_TOKEN_KEY]);
    const token = values[ACCESS_TOKEN_KEY];
    return typeof token === 'string' ? token : null;
}

async function getStoredRefreshToken() {
    const values = await chrome.storage.local.get([REFRESH_TOKEN_KEY]);
    const token = values[REFRESH_TOKEN_KEY];
    return typeof token === 'string' ? token : null;
}

async function saveRefreshedSession(session) {
    await saveStoredSession(chrome.storage.local, session);
}

async function clearExtensionSession() {
    await clearStoredSession(chrome.storage.local);
}

async function handleAuthExpired(error) {
    if (!isAuthExpiredError(error)) {
        return false;
    }
    await clearExtensionSession();
    hasExtensionSession = false;
    showPanel(loginPanel);
    return true;
}

function isAuthExpiredError(error) {
    return error instanceof Error && error.message.includes(AUTH_EXPIRED_MESSAGE);
}

function showPanel(panel) {
    for (const item of [statusPanel, loginPanel, featurePanel, previewPanel, resultPanel, documentResultPanel]) {
        item.hidden = item !== panel;
    }
}

function setStatus(message, isError = false) {
    const normalizedMessage = normalizeStatusMessage(message, isError);
    statusTitle.textContent = getStatusTitle(normalizedMessage, isError);
    statusMessage.textContent = normalizedMessage;
    statusPanel.classList.toggle('is-error', isError);
    statusPanel.classList.toggle('is-guidance', normalizedMessage === UNSUPPORTED_JOB_PAGE_MESSAGE);
    showPanel(statusPanel);
}

function getStatusTitle(message, isError = false) {
    if (message === UNSUPPORTED_JOB_PAGE_MESSAGE) {
        return '공고 페이지가 필요해요';
    }
    return isError ? '확인해 주세요' : '처리 중';
}

function normalizeStatusMessage(message, isError = false) {
    const text = String(message ?? '').replace(/\s+/g, ' ').trim();
    const fallback = isError ? '문제가 발생했습니다. 잠시 후 다시 시도해 주세요.' : '처리 중입니다.';
    const normalized = text || fallback;
    if (isError && /failed to fetch/i.test(normalized)) {
        return '서버에 연결하지 못했습니다. EZ-ONE 서버가 켜져 있는지 확인해 주세요.';
    }
    return normalized.length > 160 ? `${normalized.slice(0, 157)}...` : normalized;
}

function setStaticLinks() {
    for (const id of ['home-link', 'web-link', 'result-web-link']) {
        const link = requireElement(id);
        link.href = webAppUrl;
    }
}

function requireElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        throw new Error(`Missing element: ${id}`);
    }
    return element;
}
