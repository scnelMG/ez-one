import { createExtensionJobApi } from '../shared/api/extensionJobApi';
import { createExtensionDocumentProfileApi } from '../shared/api/extensionDocumentProfileApi';
import {
    ACCESS_TOKEN_KEY,
    PENDING_EXTENSION_CONTINUATION_KEY,
    REFRESH_TOKEN_KEY,
    buildWebLoginUrl,
    clearStoredSession,
    saveStoredSession,
    validateStoredSession
} from '../shared/auth/extensionAuth';
import './popup.css';

const apiBaseUrl = import.meta.env.VITE_EXTENSION_API_BASE_URL ?? 'http://localhost:8080/api';
const apiFallbackBaseUrls = import.meta.env.VITE_EXTENSION_API_FALLBACK_BASE_URLS ?? 'http://127.0.0.1:8080/api';
const webAppUrl = import.meta.env.VITE_EXTENSION_WEB_APP_URL ?? 'http://localhost:5173';
const AUTH_EXPIRED_MESSAGE = '\uB85C\uADF8\uC778\uC774 \uB9CC\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4';
const UNSUPPORTED_JOB_PAGE_MESSAGE = '채용공고 목록이나 캘린더에서는 저장할 공고를 정확히 찾을 수 없어요.';
const JOB_EXTRACTOR_VERSION = '2026-06-19-jasoseol-selected-root-v13';
const POSTING_WATCH_INTERVAL_MS = 1200;
const LOGIN_SESSION_POLL_INTERVAL_MS = 800;
const LOGIN_SESSION_POLL_TIMEOUT_MS = 120000;
const PANEL_RESIZE_MESSAGE = 'EZONE_PANEL_RESIZE';
const PANEL_RESIZE_EPSILON_PX = 2;
const LOGIN_CONTINUATIONS = new Set(['jobPreview', 'documentAutoFill']);
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
const companyNameInput = requireElement('company-name-input');
const positionTitleInput = requireElement('position-title-input');
const deadlineLabelInput = requireElement('deadline-label-input');
const essayFieldset = requireElement('essay-fieldset');
const essayQuestionList = requireElement('essay-question-list');
const essayQuestionStatus = requireElement('essay-question-status');
const roleOptions = requireElement('role-options');
const roleCount = requireElement('role-count');
const basketLink = requireElement('basket-link');
const savedJobList = requireElement('saved-job-list');
const documentResultTitle = requireElement('document-result-title');
const autofillSummary = requireElement('autofill-summary');
const autofillFilledCount = requireElement('autofill-filled-count');
const autofillFilledLabel = requireElement('autofill-filled-label');
const autofillReviewCount = requireElement('autofill-review-count');
const autofillCopyCount = requireElement('autofill-copy-count');
const autofillFilledHeading = requireElement('autofill-filled-heading');
const autofillFilledCaption = requireElement('autofill-filled-caption');
const autofillFilledList = requireElement('autofill-filled-list');
const autofillFailedList = requireElement('autofill-failed-list');
const autofillCopyList = requireElement('autofill-copy-list');
const autofillApplyButton = requireElement('autofill-apply-button');
const autofillRescanButton = requireElement('autofill-rescan-button');
const activityAssistSection = requireElement('activity-assist-section');
const activityAssistButton = requireElement('activity-assist-button');
const activityAssistCaption = requireElement('activity-assist-caption');
const activityAssistCountInput = requireElement('activity-assist-count-input');
const activityAssistLimitInput = requireElement('activity-assist-limit-input');
const activityAssistUnitSelect = requireElement('activity-assist-unit-select');
const activityAssistStatus = requireElement('activity-assist-status');
const activityAssistList = requireElement('activity-assist-list');
const ACTIVITY_ASSIST_BUTTON_LABEL = 'AI로 활동 추천 만들기';
let currentPosting = null;
let pendingDocumentAutoFillProfile = null;
let activityAssistContext = null;
let activityAssistAutoRequestKey = null;
let activeEssayRole = null;
let essayQuestionRequestId = 0;
let waitingForWebLogin = false;
let hasExtensionSession = false;
let pendingLoginContinuation = null;
let isReadingPreview = false;
let isSavingJob = false;
let lastObservedPostingUrl = null;
let postingWatchTimer = null;
let loginSessionPollTimer = null;
let loginSessionPollStartedAt = 0;
let panelResizeFrame = null;
let lastReportedPanelHeight = 0;
const contentScriptLoadPromises = new Map();

const jobApi = createExtensionJobApi({
    apiBaseUrl,
    apiFallbackBaseUrls,
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
setupPanelAutoResize();
chrome.storage.onChanged?.addListener(handleSessionStorageChanged);
loginButton.addEventListener('click', async () => {
    const tab = await getActiveTab();
    await rememberPendingLoginContinuation(pendingLoginContinuation ?? inferVisibleLoginContinuation());
    const loginUrl = buildWebLoginUrl({
        webAppUrl,
        currentUrl: tab.url ?? '',
        sourceTabId: tab.id
    });
    waitingForWebLogin = true;
    startLoginSessionPolling();
    await chrome.tabs.create({ url: loginUrl.toString() });
    setStatus('Google 로그인을 완료하면 자동으로 이어집니다.');
});
jobSaveModeButton.addEventListener('click', () => {
    void runAuthenticatedAction('jobPreview', () => loadPreview({ showUnsupportedMessage: true }));
});
documentInputModeButton.addEventListener('click', () => {
    void runAuthenticatedAction('documentAutoFill', () => previewDocumentAutoFill());
});
autofillApplyButton.addEventListener('click', () => {
    void runAuthenticatedAction('documentAutoFill', () => applyDocumentAutoFill());
});
autofillRescanButton.addEventListener('click', () => {
    void runAuthenticatedAction('documentAutoFill', () => {
        pendingDocumentAutoFillProfile = null;
        return previewDocumentAutoFill();
    });
});
activityAssistButton.addEventListener('click', () => {
    void runAuthenticatedAction('documentAutoFill', () => requestActivityAssist());
});
reloadPreviewButton.addEventListener('click', () => {
    void runAuthenticatedAction('jobPreview', () => loadPreview({ force: true, showUnsupportedMessage: true }));
});
saveButton.addEventListener('click', async () => {
    if (!currentPosting) {
        return;
    }
    if (!await ensureAuthenticatedExtensionSession('jobPreview')) {
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
            ? '선택한 직무가 저장되었습니다.'
            : '이미 저장된 공고입니다.';
        renderSavedJobs(savedJobs, currentPosting);
        showPanel(resultPanel);
    }
    catch (error) {
        if (await handleAuthExpired(error, 'jobPreview')) {
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
    const session = await validateStoredSession(chrome.storage.local, {
        apiBaseUrl,
        requireFreshSession: true
    });
    if (!session) {
        hasExtensionSession = false;
        showPanel(loginPanel);
        return;
    }
    await enterAuthenticatedExtensionSession();
}

async function handleSessionStorageChanged(changes, areaName) {
    if (!waitingForWebLogin || areaName !== 'local' || !hasSessionTokenChange(changes)) {
        return;
    }
    const session = await readValidatedExtensionSession();
    if (!session) {
        return;
    }
    await resumeAfterWebLogin();
}

function hasSessionTokenChange(changes) {
    return Boolean(changes?.[ACCESS_TOKEN_KEY] || changes?.[REFRESH_TOKEN_KEY]);
}

function startLoginSessionPolling() {
    stopLoginSessionPolling();
    loginSessionPollStartedAt = Date.now();
    loginSessionPollTimer = setInterval(() => {
        void reconcileWebLoginSession();
    }, LOGIN_SESSION_POLL_INTERVAL_MS);
}

function stopLoginSessionPolling() {
    if (loginSessionPollTimer === null) {
        return;
    }
    clearInterval(loginSessionPollTimer);
    loginSessionPollTimer = null;
    loginSessionPollStartedAt = 0;
}

async function reconcileWebLoginSession() {
    if (!waitingForWebLogin) {
        stopLoginSessionPolling();
        return;
    }
    if (Date.now() - loginSessionPollStartedAt > LOGIN_SESSION_POLL_TIMEOUT_MS) {
        stopLoginSessionPolling();
        setStatus('로그인 연결이 지연되고 있습니다. Google 로그인 완료 후 다시 시도해 주세요.', true);
        return;
    }
    const session = await readValidatedExtensionSession();
    if (!session) {
        return;
    }
    await resumeAfterWebLogin();
}

async function resumeAfterWebLogin() {
    stopLoginSessionPolling();
    waitingForWebLogin = false;
    await enterAuthenticatedExtensionSession();
}

async function enterAuthenticatedExtensionSession() {
    hasExtensionSession = Boolean(true);
    await resumePendingExtensionAction();
}

async function readValidatedExtensionSession() {
    return await validateStoredSession(chrome.storage.local, {
        apiBaseUrl,
        requireFreshSession: true
    });
}

async function runAuthenticatedAction(continuation, action) {
    if (!await ensureAuthenticatedExtensionSession(continuation)) {
        return;
    }
    await action();
}

async function ensureAuthenticatedExtensionSession(continuation = null) {
    const session = await readValidatedExtensionSession();
    if (session) {
        hasExtensionSession = true;
        return true;
    }
    await clearExtensionSession();
    hasExtensionSession = false;
    await rememberPendingLoginContinuation(continuation);
    showPanel(loginPanel);
    return false;
}

async function resumePendingExtensionAction() {
    const continuation = pendingLoginContinuation ?? await readPendingLoginContinuation();
    await rememberPendingLoginContinuation(null);
    if (continuation === 'documentAutoFill') {
        await previewDocumentAutoFill();
        return;
    }
    if (continuation === 'jobPreview') {
        await loadPreview({ force: true, showUnsupportedMessage: true });
        return;
    }
    showFeatureSelection();
}

function inferVisibleLoginContinuation() {
    if (!documentResultPanel.hidden) {
        return 'documentAutoFill';
    }
    if (!previewPanel.hidden || !resultPanel.hidden) {
        return 'jobPreview';
    }
    return null;
}

async function rememberPendingLoginContinuation(continuation) {
    const normalizedContinuation = normalizeLoginContinuation(continuation);
    pendingLoginContinuation = normalizedContinuation;
    if (!normalizedContinuation) {
        await chrome.storage.local.remove([PENDING_EXTENSION_CONTINUATION_KEY]);
        return;
    }
    await chrome.storage.local.set({
        [PENDING_EXTENSION_CONTINUATION_KEY]: normalizedContinuation
    });
}

async function readPendingLoginContinuation() {
    const values = await chrome.storage.local.get([PENDING_EXTENSION_CONTINUATION_KEY]);
    return normalizeLoginContinuation(values[PENDING_EXTENSION_CONTINUATION_KEY]);
}

function normalizeLoginContinuation(continuation) {
    return LOGIN_CONTINUATIONS.has(continuation) ? continuation : null;
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
        if (!hasMinimumPostingData(posting)) {
            throw new Error(UNSUPPORTED_JOB_PAGE_MESSAGE);
        }
        currentPosting = posting;
        await jobApi.preview(posting);
        renderPosting(posting);
        showPanel(previewPanel);
        void loadEssayQuestionsForSelectedRole();
    }
    catch (error) {
        if (await handleAuthExpired(error, 'jobPreview')) {
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
    if (!hasExtensionSession || waitingForWebLogin || isReadingPreview || isSavingJob || !loginPanel.hidden || !featurePanel.hidden || !documentResultPanel.hidden) {
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
            parsedUrl.pathname === '/' ||
            parsedUrl.searchParams.has('campaignid') ||
            parsedUrl.searchParams.has('ec');
    } catch {
        return false;
    }
}

function hasMinimumPostingData(posting) {
    return Boolean(posting?.companyName &&
        posting?.positionTitle &&
        posting?.deadlineLabel &&
        Array.isArray(posting?.roleOptions) &&
        posting.roleOptions.length > 0);
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

async function previewDocumentAutoFill() {
    try {
        setStatus('현재 페이지의 입력칸을 확인하고 있습니다.');
        const tab = await getActiveTab();
        if (!tab.id) {
            setStatus('현재 탭을 찾지 못했습니다.', true);
            return;
        }
        const profile = await documentProfileApi.getDocumentProfile();
        pendingDocumentAutoFillProfile = profile;
        await ensureContentScriptLoaded(tab.id, 'assets/applicationAutoFill.js', () => Boolean(window.ezOneAutoFillApplicationLoaded));
        const result = await sendContentScriptMessage(tab.id, {
            type: 'EZONE_PREVIEW_APPLICATION_AUTOFILL',
            profile
        });
        renderAutoFillResult(result);
        showPanel(documentResultPanel);
    }
    catch (error) {
        if (await handleAuthExpired(error, 'documentAutoFill')) {
            return;
        }
        setStatus(error instanceof Error ? error.message : '서류 정보 자동 입력에 실패했습니다.', true);
    }
}

async function applyDocumentAutoFill() {
    try {
        setStatus('확인한 서류 정보를 입력하고 있습니다.');
        autofillApplyButton.disabled = true;
        autofillApplyButton.textContent = '입력 중';
        const tab = await getActiveTab();
        if (!tab.id) {
            setStatus('현재 탭을 찾지 못했습니다.', true);
            return;
        }
        const profile = pendingDocumentAutoFillProfile ?? await documentProfileApi.getDocumentProfile();
        await ensureContentScriptLoaded(tab.id, 'assets/applicationAutoFill.js', () => Boolean(window.ezOneAutoFillApplicationLoaded));
        const result = await sendContentScriptMessage(tab.id, {
            type: 'EZONE_APPLY_APPLICATION_AUTOFILL',
            profile
        });
        pendingDocumentAutoFillProfile = null;
        renderAutoFillResult(result);
        showPanel(documentResultPanel);
    }
    catch (error) {
        if (await handleAuthExpired(error, 'documentAutoFill')) {
            return;
        }
        setStatus(error instanceof Error ? error.message : '서류 정보 자동 입력에 실패했습니다.', true);
    }
    finally {
        autofillApplyButton.disabled = false;
        autofillApplyButton.textContent = '자동 입력 시작';
    }
}

async function ensureContentScriptLoaded(tabId, file, isLoaded) {
    const loadKey = `${tabId}:${file}`;
    if (contentScriptLoadPromises.has(loadKey)) {
        await contentScriptLoadPromises.get(loadKey);
        return;
    }
    const loadPromise = withTransientTabRetry(() => loadContentScript(tabId, file, isLoaded))
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

async function sendContentScriptMessage(tabId, message) {
    return await withTransientTabRetry(() => chrome.tabs.sendMessage(tabId, message));
}

async function withTransientTabRetry(operation) {
    let lastError;
    for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
            return await operation();
        }
        catch (error) {
            lastError = error;
            if (!isTransientTabError(error) || attempt === 2) {
                throw error;
            }
            await sleep(120);
        }
    }
    throw lastError;
}

function isTransientTabError(error) {
    const message = error instanceof Error ? error.message : String(error ?? '');
    return [
        'Frame with ID 0 was removed',
        'Receiving end does not exist',
        'Could not establish connection',
        'The tab was closed',
        'No tab with id'
    ].some((item) => message.includes(item));
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function renderPosting(posting) {
    activeEssayRole = null;
    essayQuestionRequestId += 1;
    companyNameInput.value = posting.companyName ?? '';
    positionTitleInput.value = posting.positionTitle ?? '';
    deadlineLabelInput.value = posting.deadlineLabel ?? '';
    hideEssayQuestions();
    const roles = posting.roleOptions.length > 0
        ? posting.roleOptions
        : [posting.positionTitle ?? '선택 직무'];
    roleCount.textContent = `${roles.length}개`;
    roleOptions.replaceChildren(...roles.map((role) => {
        const label = document.createElement('label');
        const input = document.createElement('input');
        const labelText = document.createElement('span');
        const parsedRole = parseDisplayRole(role);
        input.type = 'checkbox';
        input.value = role;
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
    if (selectedRoles.length === 0) {
        activeEssayRole = null;
        hideEssayQuestions();
        return;
    }
    showEssayQuestions();
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

function hideEssayQuestions() {
    essayFieldset.hidden = true;
    essayQuestionStatus.textContent = '';
    essayQuestionStatus.classList.remove('is-warning');
    essayQuestionList.replaceChildren();
    schedulePanelResize();
}

function showEssayQuestions() {
    essayFieldset.hidden = false;
    schedulePanelResize();
}

function renderEssayQuestionLoading(role) {
    showEssayQuestions();
    essayQuestionList.replaceChildren();
    essayQuestionStatus.textContent = `"${role}" 자소서 문항을 확인하고 있습니다.`;
    essayQuestionStatus.classList.remove('is-warning');
    schedulePanelResize();
}

function renderEssayQuestionInputs(questions = [], options = {}) {
    const showFallback = options.showFallback ?? true;
    const validQuestions = questions
        .map((question) => ({
        prompt: normalizeInput(question?.prompt ?? ''),
        maxLength: Number.isFinite(Number(question?.maxLength)) ? Number(question.maxLength) : null,
        maxLengthUnit: normalizeMaxLengthUnit(question?.maxLengthUnit)
    }))
        .filter((question) => question.prompt);
    const items = validQuestions.length > 0
        ? validQuestions
        : showFallback ? [{ prompt: '', maxLength: null, maxLengthUnit: null }] : [];
    essayQuestionList.replaceChildren(...items.map(createEssayQuestionInput));
    schedulePanelResize();
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
    meta.textContent = formatEssayQuestionLimit(question);
    preview.className = 'essay-question-preview';
    preview.textContent = hasPrompt ? question.prompt : '문항을 직접 입력하세요.';
    textarea.className = 'essay-question-input';
    textarea.setAttribute('data-max-length', question.maxLength ? String(question.maxLength) : '');
    textarea.setAttribute('data-max-length-unit', question.maxLengthUnit ?? '');
    textarea.rows = getEssayQuestionRows(question.prompt);
    textarea.placeholder = '자소서 문항을 입력하세요.';
    textarea.value = question.prompt;
    textarea.addEventListener('input', () => {
        autoResizeEssayQuestionInput(textarea);
    });
    item.addEventListener('toggle', () => {
        if (!item.open) {
            return;
        }
        requestAnimationFrame(() => {
            autoResizeEssayQuestionInput(textarea);
            schedulePanelResize();
            item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        });
    });

    title.append(meta);
    header.append(title, action);
    summary.append(header, preview);
    item.append(summary, textarea);
    requestAnimationFrame(() => {
        autoResizeEssayQuestionInput(textarea);
        schedulePanelResize();
    });
    return item;
}

function autoResizeEssayQuestionInput(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight + 2}px`;
    schedulePanelResize();
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
            accumulator[role] = source[role].map(toSaveableEssayQuestion);
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
        essayQuestionStatus.textContent = `${questions.length}개 문항을 가져왔습니다.`;
        essayQuestionStatus.classList.remove('is-warning');
        return;
    }
    if ((currentPosting?.essayQuestions ?? []).length > 0) {
        essayQuestionStatus.textContent = `공통 문항 ${questions.length}개를 사용합니다.`;
        essayQuestionStatus.classList.remove('is-warning');
        return;
    }
    const roleLabel = selectedRoles[0] ? `"${selectedRoles[0]}" ` : '';
    essayQuestionStatus.textContent = `${roleLabel}문항을 자동으로 확인하지 못했습니다. 직접 입력할 수 있습니다.`;
    essayQuestionStatus.classList.add('is-warning');
}

function renderEssayQuestionStatus(matchedRole, questions, selectedRoles, hasNoEssayQuestions = false) {
    if (matchedRole && questions.length > 0) {
        essayQuestionStatus.textContent = `${questions.length}개 문항을 가져왔습니다.`;
        essayQuestionStatus.classList.remove('is-warning');
        return;
    }
    if (hasNoEssayQuestions) {
        const roleLabel = selectedRoles[0] ? `"${selectedRoles[0]}" ` : '';
        essayQuestionStatus.textContent = `${roleLabel}자소서 문항이 없는 공고입니다.`;
        essayQuestionStatus.classList.remove('is-warning');
        return;
    }
    if ((currentPosting?.essayQuestions ?? []).length > 0) {
        essayQuestionStatus.textContent = `공통 문항 ${questions.length}개를 사용합니다.`;
        essayQuestionStatus.classList.remove('is-warning');
        return;
    }
    const roleLabel = selectedRoles[0] ? `"${selectedRoles[0]}" ` : '';
    essayQuestionStatus.textContent = `${roleLabel}문항을 자동으로 확인하지 못했습니다. 직접 입력할 수 있습니다.`;
    essayQuestionStatus.classList.add('is-warning');
}

function collectEssayQuestions() {
    return Array.from(essayQuestionList.querySelectorAll('.essay-question-input'))
        .map((input) => ({
        prompt: normalizeInput(input.value),
        maxLength: normalizeMaxLength(input.getAttribute('data-max-length')),
        maxLengthUnit: normalizeMaxLengthUnit(input.getAttribute('data-max-length-unit'))
    }))
        .filter((question) => question.prompt)
        .map((question) => ({
        prompt: question.prompt,
        maxLength: question.maxLength
    }));
}

function toSaveableEssayQuestion(question) {
    return {
        prompt: question.prompt,
        maxLength: Number.isFinite(Number(question.maxLength)) ? Number(question.maxLength) : null
    };
}

function normalizeMaxLength(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function normalizeMaxLengthUnit(value) {
    return value === 'byte' || value === 'char' ? value : null;
}

function formatEssayQuestionLimit(question) {
    if (!question.maxLength) {
        return '글자 수 제한 없음';
    }
    return question.maxLengthUnit === 'byte'
        ? `${question.maxLength}byte`
        : `${question.maxLength}자`;
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
    const isPreview = result?.mode === 'preview';
    const planned = Array.isArray(result?.planned) ? result.planned : [];
    const filled = Array.isArray(result?.filled) ? result.filled : [];
    const failed = Array.isArray(result?.failed) ? result.failed : [];
    const copyCandidates = Array.isArray(result?.copyCandidates) ? result.copyCandidates : [];
    const primaryItems = sortByDisplayOrder(uniqueAutoFillItems((isPreview ? planned : filled).filter(isUserVisibleAutoFillItem)));
    const primaryCoverage = createPrimaryAutoFillCoverage(primaryItems);
    const visibleFailed = sortByDisplayOrder(failed.filter((item) => shouldShowManualReviewItem(item, primaryCoverage)));
    const visibleCopyCandidates = copyCandidates.filter((item) => shouldShowCopyCandidate(item, primaryCoverage));
    const groupedCopyCandidates = sortByDisplayOrder(groupActivityCopyCandidates(visibleCopyCandidates));
    const manualReviewItems = sortByDisplayOrder(buildManualReviewItems(visibleFailed));
    documentResultTitle.textContent = isPreview ? '입력 전 확인' : '입력이 끝났습니다';
    autofillFilledLabel.textContent = isPreview ? '입력 예정' : '입력됨';
    autofillFilledHeading.textContent = isPreview ? '입력 예정' : '자동 입력됨';
    autofillFilledCaption.textContent = isPreview
        ? `${primaryItems.length}개 자동 입력 가능`
        : `${primaryItems.length}개 자동 입력 완료`;
    autofillFilledCaption.hidden = false;
    autofillApplyButton.hidden = !isPreview;
    if (autofillApplyButton.parentElement) {
        autofillApplyButton.parentElement.hidden = false;
    }
    autofillApplyButton.textContent = '자동 입력 시작';
    autofillApplyButton.disabled = isPreview && primaryItems.length === 0;
    autofillFilledCount.textContent = String(primaryItems.length);
    autofillReviewCount.textContent = String(manualReviewItems.length);
    autofillCopyCount.textContent = String(groupedCopyCandidates.length);
    autofillSummary.textContent = isPreview
        ? `자동 입력 전 아래 항목을 확인해 주세요. 입력 예정 ${primaryItems.length}개, 확인 필요 ${manualReviewItems.length}개, 복사 필요 ${groupedCopyCandidates.length}개.`
        : `${primaryItems.length}개 항목을 입력했습니다. 확인 필요 ${manualReviewItems.length}개, 복사 필요 ${groupedCopyCandidates.length}개.`;
    renderPrimaryAutoFillList(autofillFilledList, primaryItems, isPreview);
    renderResultList(autofillFailedList, manualReviewItems, formatManualReviewDisplay, '확인 필요 항목이 없습니다.');
    renderResultList(autofillCopyList, groupedCopyCandidates, formatCopyCandidateDisplay, '복사할 항목이 없습니다.');
    configureActivityAssist(manualReviewItems, groupedCopyCandidates);
}

function configureActivityAssist(manualReviewItems, copyCandidates) {
    const shouldShow = shouldShowActivityAssist(manualReviewItems, copyCandidates);
    activityAssistSection.hidden = !shouldShow;
    if (!shouldShow) {
        activityAssistContext = null;
        activityAssistAutoRequestKey = null;
        activityAssistStatus.hidden = true;
        activityAssistList.replaceChildren();
        return;
    }

    activityAssistContext = {
        pageContext: manualReviewItems
            .filter((item) => item?.reason === 'tailored_activity_required')
            .map((item) => item?.label ?? item?.fieldKey)
            .filter(Boolean)
            .join(' '),
        fieldLabels: copyCandidates
            .map((item) => item?.title ?? item?.label)
            .filter(Boolean)
            .slice(0, 8)
    };
    activityAssistButton.textContent = ACTIVITY_ASSIST_BUTTON_LABEL;
    activityAssistButton.disabled = false;
    activityAssistCaption.textContent = '직무 적합도 순으로 정렬하고 글자수에 맞춘 붙여넣기 문장을 만듭니다.';
    activityAssistStatus.hidden = true;
    activityAssistList.replaceChildren();
    scheduleAutomaticActivityAssistRequest();
}

function shouldShowActivityAssist(manualReviewItems, copyCandidates) {
    return manualReviewItems.some((item) => item?.reason === 'tailored_activity_required')
        || copyCandidates.some((item) => item?.isActivityGroup || /^activities\.\d+/.test(String(item?.key ?? '')));
}

function scheduleAutomaticActivityAssistRequest() {
    const requestKey = getActivityAssistRequestKey();
    if (!requestKey || activityAssistAutoRequestKey === requestKey) {
        return;
    }
    activityAssistAutoRequestKey = requestKey;
    const defer = typeof queueMicrotask === 'function'
        ? queueMicrotask
        : (callback) => setTimeout(callback, 0);
    defer(() => {
        if (activityAssistAutoRequestKey !== requestKey || getActivityAssistRequestKey() !== requestKey) {
            return;
        }
        void runAuthenticatedAction('documentAutoFill', () => requestActivityAssist({ automatic: true }));
    });
}

function getActivityAssistRequestKey() {
    if (!activityAssistContext) {
        return null;
    }
    return JSON.stringify({
        companyName: currentPosting?.companyName ?? '',
        positionTitle: currentPosting?.positionTitle ?? '',
        pageContext: activityAssistContext.pageContext,
        fieldLabels: activityAssistContext.fieldLabels,
        maxItems: parsePositiveInt(activityAssistCountInput.value),
        detailLimit: parsePositiveInt(activityAssistLimitInput.value),
        detailLimitUnit: activityAssistUnitSelect.value === 'byte' ? 'byte' : 'char'
    });
}

async function requestActivityAssist(options = {}) {
    if (!activityAssistContext || activityAssistButton.disabled) return;
    const isAutomatic = Boolean(options.automatic);
    activityAssistButton.disabled = true;
    activityAssistButton.textContent = 'AI 분석 중';
    activityAssistStatus.hidden = false;
    activityAssistStatus.textContent = isAutomatic
        ? 'AI가 자동으로 활동을 직무 적합도 순서로 정렬하고 있습니다.'
        : 'AI가 활동을 직무 적합도 순서로 정렬하고 있습니다.';
    activityAssistList.replaceChildren();
    try {
        const result = await documentProfileApi.recommendActivities({
            companyName: currentPosting?.companyName ?? '',
            positionTitle: currentPosting?.positionTitle ?? '',
            maxItems: parsePositiveInt(activityAssistCountInput.value),
            detailLimit: parsePositiveInt(activityAssistLimitInput.value),
            detailLimitUnit: activityAssistUnitSelect.value === 'byte' ? 'byte' : 'char',
            pageContext: activityAssistContext.pageContext,
            fieldLabels: activityAssistContext.fieldLabels
        });
        renderActivityAssistResult(result);
    } catch {
        activityAssistStatus.hidden = false;
        activityAssistStatus.textContent = 'AI 추천을 만들지 못했습니다. 아래 복사 필요 항목은 계속 사용할 수 있어요.';
    } finally {
        activityAssistButton.disabled = false;
        activityAssistButton.textContent = ACTIVITY_ASSIST_BUTTON_LABEL;
    }
}

function renderActivityAssistResult(result) {
    const warnings = Array.isArray(result?.warnings) ? result.warnings : [];
    const recommendations = Array.isArray(result?.recommendations) ? result.recommendations : [];
    activityAssistStatus.hidden = warnings.length === 0 && recommendations.length > 0;
    activityAssistStatus.textContent = warnings[0] ?? (recommendations.length > 0 ? `AI가 ${recommendations.length}개 활동을 직무 적합도 순으로 정렬하고 글자수에 맞췄습니다.` : '추천 결과가 없습니다.');
    if (recommendations.length === 0) {
        const emptyItem = document.createElement('li');
        emptyItem.className = 'is-empty';
        emptyItem.textContent = '추천 결과가 없습니다.';
        activityAssistList.replaceChildren(emptyItem);
        return;
    }
    activityAssistList.replaceChildren(...recommendations.map(createActivityAssistItem));
}

function createActivityAssistItem(recommendation) {
    const item = document.createElement('li');
    const heading = document.createElement('div');
    heading.className = 'activity-assist-heading';
    const title = document.createElement('strong');
    title.textContent = `${recommendation.rank ?? ''}. ${recommendation.title ?? '활동'}`.trim();
    const score = document.createElement('em');
    score.textContent = `AI 추천도 ${recommendation.fitScore ?? 0}`;
    heading.append(title, score);
    item.append(heading);
    for (const draft of Array.isArray(recommendation.drafts) ? recommendation.drafts : []) {
        item.append(createActivityAssistDraft(draft));
    }
    appendActivityAssistText(item, '채용담당자 관점', recommendation.recruiterView);
    appendActivityAssistText(item, '현직자 관점', recommendation.practitionerView);
    appendActivityAssistText(item, '어필 요소', (recommendation.appealPoints ?? []).join(' · '));
    appendActivityAssistText(item, '주의', (recommendation.risks ?? []).join(' · '));
    return item;
}

function appendActivityAssistText(parent, label, value) {
    const text = normalizeInput(String(value ?? ''));
    if (!text) return;
    const row = document.createElement('p');
    const labelElement = document.createElement('strong');
    const valueElement = document.createElement('span');
    labelElement.textContent = label;
    valueElement.textContent = text;
    row.append(labelElement, valueElement);
    parent.append(row);
}

function createActivityAssistDraft(draft) {
    const wrapper = document.createElement('div');
    wrapper.className = 'activity-assist-draft';
    const counter = document.createElement('span');
    counter.textContent = `${draft.label ?? '글자수 맞춤'} · ${formatActivityAssistCounter(draft)}`;
    if (isActivityAssistDraftOverLimit(draft)) {
        counter.classList.add('is-over');
    }
    const text = document.createElement('p');
    text.textContent = draft.text ?? '';
    const copyButton = document.createElement('button');
    copyButton.type = 'button';
    copyButton.className = 'autofill-result-copy-button';
    copyButton.textContent = '복사';
    copyButton.addEventListener('click', async () => {
        const copied = await copyTextToClipboard(draft.text);
        copyButton.textContent = copied ? '복사됨' : '실패';
        setTimeout(() => {
            copyButton.textContent = '복사';
        }, 1200);
    });
    wrapper.append(counter, text, copyButton);
    return wrapper;
}

function formatActivityAssistCounter(draft) {
    const unit = activityAssistUnitSelect.value === 'byte' ? 'byte' : 'char';
    const limit = parsePositiveInt(activityAssistLimitInput.value);
    const count = Number(unit === 'byte' ? draft?.byteCount ?? 0 : draft?.charCount ?? 0);
    const unitLabel = unit === 'byte' ? 'byte' : '자';
    return limit ? `${count} / ${limit}${unitLabel}${isActivityAssistDraftOverLimit(draft) ? ' 초과' : ''}` : `${count}${unitLabel}`;
}

function isActivityAssistDraftOverLimit(draft) {
    const unit = activityAssistUnitSelect.value === 'byte' ? 'byte' : 'char';
    const limit = parsePositiveInt(activityAssistLimitInput.value);
    const count = Number(unit === 'byte' ? draft?.byteCount ?? 0 : draft?.charCount ?? 0);
    return limit ? count > limit : Boolean(draft?.exceedsLimit);
}

function parsePositiveInt(value) {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function createPrimaryAutoFillCoverage(primaryItems) {
    return {
        fieldKeys: new Set(primaryItems.map((item) => item?.fieldKey).filter(Boolean)),
        signatures: new Set(primaryItems.map(autoFillCoverageSignature).filter(Boolean))
    };
}

function shouldShowManualReviewItem(item, primaryCoverage) {
    return !isCoveredByPrimaryAutoFillItem(item, primaryCoverage);
}

function shouldShowCopyCandidate(item, primaryCoverage) {
    if (!isCoveredByPrimaryAutoFillItem(item, primaryCoverage)) return true;
    return item?.key === 'basicInfo.address' || item?.key === 'basicInfo.addressDetail';
}

function isCoveredByPrimaryAutoFillItem(item, primaryCoverage) {
    const key = item?.fieldKey ?? item?.key;
    if (key && primaryCoverage.fieldKeys.has(key)) return true;
    const signature = autoFillCoverageSignature(item);
    return Boolean(signature && primaryCoverage.signatures.has(signature));
}

function autoFillCoverageSignature(item) {
    const label = normalizeCoverageText(item?.label ?? item?.title ?? '');
    const value = normalizeCoverageText(item?.value ?? item?.body ?? '');
    return label && value ? `${label}|${value}` : null;
}

function normalizeCoverageText(value) {
    return String(value ?? '').toLowerCase().replace(/\s+/g, '').trim() || null;
}

function sortByDisplayOrder(items) {
    return [...items].sort((left, right) => {
        const leftOrder = normalizedDisplayOrder(left);
        const rightOrder = normalizedDisplayOrder(right);
        if (leftOrder !== rightOrder) return leftOrder - rightOrder;
        return 0;
    });
}

function normalizedDisplayOrder(item) {
    return Number.isFinite(item?.displayOrder) ? item.displayOrder : Number.POSITIVE_INFINITY;
}

function groupActivityCopyCandidates(candidates) {
    const grouped = [];
    const activityGroups = new Map();
    const activityGroupOrder = [];
    for (const item of candidates) {
        const activityMatch = String(item?.key ?? '').match(/^activities\.(\d+)\.(.+)$/);
        if (!activityMatch) {
            grouped.push(item);
            continue;
        }
        const index = activityMatch[1];
        const field = activityMatch[2];
        if (!activityGroups.has(index)) {
            activityGroups.set(index, {
                key: `activities.${index}`,
                label: `활동 ${Number(index) + 1}`,
                fields: {},
                sourceItems: []
            });
            activityGroupOrder.push(index);
        }
        const group = activityGroups.get(index);
        group.fields[field] = item.value;
        group.sourceItems.push(item);
        const currentOrder = group.displayOrder;
        if (Number.isFinite(item.displayOrder) && (!Number.isFinite(currentOrder) || item.displayOrder < currentOrder)) {
            group.displayOrder = item.displayOrder;
        }
    }
    return [
        ...grouped,
        ...activityGroupOrder.map((index) => formatActivityCopyCandidate(activityGroups.get(index)))
    ];
}

function formatActivityCopyCandidate(group) {
    const fields = group?.fields ?? {};
    const title = fields.activityName || fields.title || group?.label || '활동';
    const rows = [
        ['활동구분', fields.activityType],
        ['활동명', fields.activityName || fields.title],
        ['기관/조직', fields.organization],
        ['활동기간', fields.period],
        ['역할', fields.role],
        ['상세 내용', fields.description || fields.summary],
        ['성과', fields.outcome]
    ].filter(([, value]) => normalizeInput(String(value ?? '')));
    const body = rows
        .slice(0, 4)
        .map(([label, value]) => `${label}: ${value}`)
        .join('\n');
    const copyText = rows
        .map(([label, value]) => `${label}: ${value}`)
        .join('\n');
    return {
        key: group.key,
        label: group.label,
        title,
        value: copyText,
        body,
        isActivityGroup: true,
        displayOrder: group?.displayOrder
    };
}

function formatCopyCandidateDisplay(item) {
    return {
        title: item.title ?? item.label,
        body: item.body ?? item.value,
        preserveBodyLines: Boolean(item.isActivityGroup),
        actionLabel: '\uBCF5\uC0AC',
        actionDoneLabel: '\uBCF5\uC0AC\uB428',
        actionValue: item.value,
        actionAriaLabel: `${item.label ?? '\uAC12'} \uBCF5\uC0AC`
    };
}

function buildManualReviewItems(failed) {
    const seenKeys = new Set();
    const reviewItems = [];
    for (const item of failed) {
        const key = item?.fieldKey ?? item?.key ?? item?.label;
        if (key) {
            if (seenKeys.has(key)) {
                continue;
            }
            seenKeys.add(key);
        }
        reviewItems.push(item);
    }
    return reviewItems;
}

function formatManualReviewDisplay(item) {
    return {
        title: item.label ?? '알 수 없는 입력칸',
        ...getAutofillFailureDisplay(item)
    };
}

function uniqueAutoFillItems(items) {
    const seen = new Set();
    const unique = [];
    for (const item of items) {
        const key = [
            item?.fieldKey ?? '',
            normalizeInput(String(item?.value ?? '')),
            item?.sectionOpenControl ? 'section' : 'field'
        ].join('|');
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        unique.push(item);
    }
    return unique;
}

function getPrimaryAutoFillDisplay(item, isPreview) {
    return {
        title: item.label ?? item.fieldKey,
        body: item.value
    };
}

function renderPrimaryAutoFillList(list, items, isPreview) {
    if (items.length === 0) {
        const item = document.createElement('li');
        item.className = 'is-empty';
        item.textContent = isPreview ? '입력 예정 항목이 없습니다.' : '자동 입력된 항목이 없습니다.';
        list.replaceChildren(item);
        return;
    }
    const groupedItems = groupPrimaryAutoFillItems(items);
    list.replaceChildren(...groupedItems.map((entry) => {
        if (entry.type === 'basic-info-group' || entry.type === 'education-group' || entry.type === 'certificate-group' || entry.type === 'military-group' || entry.type === 'career-group' || entry.type === 'language-test-group') {
            return createAutoFillGroupCard(entry);
        }
        return createAutoFillResultListItem(entry.item, (item) => getPrimaryAutoFillDisplay(item, isPreview));
    }));
}

function groupPrimaryAutoFillItems(items) {
    const basicInfoGroups = createBasicInfoAutoFillGroups(items);
    const educationGroups = createEducationAutoFillGroups(items);
    const certificateGroups = createCertificateAutoFillGroups(items);
    const militaryGroups = createMilitaryAutoFillGroups(items);
    const careerGroups = createCareerAutoFillGroups(items);
    const languageTestGroups = createLanguageTestAutoFillGroups(items);
    const groupedItemSet = new Set([
        ...basicInfoGroups,
        ...educationGroups,
        ...certificateGroups,
        ...militaryGroups,
        ...careerGroups,
        ...languageTestGroups
    ].flatMap((group) => group.items));
    return sortByDisplayOrder([
        ...items
            .filter((item) => !groupedItemSet.has(item))
            .map((item) => ({ type: 'item', item, displayOrder: normalizedDisplayOrder(item) })),
        ...basicInfoGroups,
        ...educationGroups,
        ...certificateGroups,
        ...militaryGroups,
        ...careerGroups,
        ...languageTestGroups
    ]);
}

function createBasicInfoAutoFillGroups(items) {
    const basicInfoItems = items.filter((item) => String(item?.fieldKey ?? '').startsWith('basicInfo.'));
    if (basicInfoItems.length === 0) {
        return [];
    }
    return [{
        type: 'basic-info-group',
        title: '\uAE30\uBCF8 \uC815\uBCF4',
        items: basicInfoItems,
        summaryLines: createBasicInfoSummary(basicInfoItems),
        displayOrder: Math.min(...basicInfoItems.map(normalizedDisplayOrder))
    }];
}

function createBasicInfoSummary(items) {
    return [
        joinAutoFillSummaryParts([
            getAutoFillValueByFieldKey(items, 'basicInfo.nameKo'),
            getAutoFillValueByFieldKey(items, 'basicInfo.nameEn')
        ]),
        joinAutoFillSummaryParts([
            labelValue('\uC0DD\uB144\uC6D4\uC77C', getAutoFillValueByFieldKey(items, 'basicInfo.birthdate')),
            getAutoFillValueByFieldKey(items, 'basicInfo.gender')
        ]),
        joinAutoFillSummaryParts([
            getAutoFillValueByFieldKey(items, 'basicInfo.email'),
            getAutoFillValueByFieldKey(items, 'basicInfo.phone')
        ]),
        joinAutoFillSummaryParts([
            getAutoFillValueByFieldKey(items, 'basicInfo.address'),
            getAutoFillValueByFieldKey(items, 'basicInfo.addressDetail')
        ]),
        joinAutoFillSummaryParts([
            getAutoFillValueByFieldKey(items, 'basicInfo.applicationCareerType'),
            getAutoFillValueByFieldKey(items, 'basicInfo.applicationSource'),
            getAutoFillValueByFieldKey(items, 'basicInfo.profilePhoto')
        ])
    ].filter(Boolean);
}

function createEducationAutoFillGroups(items) {
    const highSchoolItems = items.filter((item) => String(item?.fieldKey ?? '').startsWith('education.highSchool.'));
    const universityItems = items.filter((item) => /^education\.universities\.\d+\./.test(String(item?.fieldKey ?? '')));
    const universityBaseItems = universityItems.filter((item) => {
        const fieldKey = String(item?.fieldKey ?? '');
        return !fieldKey.includes('.majors.') && !isEducationGradeField(fieldKey);
    });
    const majorItems = universityItems.filter((item) => String(item?.fieldKey ?? '').includes('.majors.'));
    const gradeItems = universityItems.filter((item) => isEducationGradeField(String(item?.fieldKey ?? '')));
    return [
        createEducationGroup('\uACE0\uB4F1\uD559\uAD50', highSchoolItems, createHighSchoolSummary(highSchoolItems)),
        createEducationGroup('\uB300\uD559\uAD50', universityBaseItems, createUniversitySummary(universityBaseItems)),
        createEducationGroup('\uC804\uACF5', majorItems, createMajorSummary(majorItems, universityItems)),
        createEducationGroup('\uC131\uC801', gradeItems, createGradeSummary(gradeItems))
    ].filter(Boolean);
}

function createEducationGroup(title, items, summaryLines) {
    if (items.length === 0) return null;
    return {
        type: 'education-group',
        title,
        items,
        summaryLines: summaryLines.length > 0 ? summaryLines : [`${items.length}개 항목`],
        displayOrder: Math.min(...items.map(normalizedDisplayOrder))
    };
}

function createCertificateAutoFillGroups(items) {
    const certificateGroups = new Map();
    const certificateItems = [];
    for (const item of items) {
        const match = String(item?.fieldKey ?? '').match(/^certificates\.certificates\.(\d+)\.(.+)$/);
        if (!match) continue;
        const [, index, field] = match;
        if (!certificateGroups.has(index)) {
            certificateGroups.set(index, { items: [], fields: {}, displayOrder: normalizedDisplayOrder(item) });
        }
        const group = certificateGroups.get(index);
        group.items.push(item);
        group.fields[field] = item.value;
        group.displayOrder = Math.min(group.displayOrder, normalizedDisplayOrder(item));
        certificateItems.push(item);
    }
    if (certificateItems.length === 0) {
        return [];
    }
    const summaryLines = [...certificateGroups.entries()]
        .sort(([left], [right]) => Number(left) - Number(right))
        .map(([, group]) => createCertificateSummaryLine(group.fields))
        .filter(Boolean);
    return [{
        type: 'certificate-group',
        title: '\uC790\uACA9\uC99D',
        items: certificateItems,
        itemCount: certificateGroups.size,
        summaryLines: summaryLines.length > 0 ? summaryLines : [`${certificateGroups.size}개 자격증`],
        displayOrder: Math.min(...certificateItems.map(normalizedDisplayOrder))
    }];
}

function createCertificateSummaryLine(fields) {
    return joinAutoFillSummaryParts([
        fields.certificateName,
        fields.issuingOrganization,
        fields.acquisitionDate,
        fields.registrationNumber
    ]);
}

function createLanguageTestAutoFillGroups(items) {
    const languageGroups = new Map();
    const languageItems = [];
    for (const item of items) {
        const match = String(item?.fieldKey ?? '').match(/^certificates\.languageTests\.(\d+)\.(.+)$/);
        if (!match) continue;
        const [, index, field] = match;
        if (!languageGroups.has(index)) {
            languageGroups.set(index, { items: [], fields: {}, displayOrder: normalizedDisplayOrder(item) });
        }
        const group = languageGroups.get(index);
        group.items.push(item);
        group.fields[field] = item.value;
        group.displayOrder = Math.min(group.displayOrder, normalizedDisplayOrder(item));
        languageItems.push(item);
    }
    if (languageItems.length === 0) {
        return [];
    }
    const summaryLines = [...languageGroups.entries()]
        .sort(([left], [right]) => Number(left) - Number(right))
        .map(([, group]) => createLanguageTestSummaryLine(group.fields))
        .filter(Boolean);
    return [{
        type: 'language-test-group',
        title: '\uC5B4\uD559',
        items: languageItems,
        itemCount: languageGroups.size,
        summaryLines: summaryLines.length > 0 ? summaryLines : [`${languageGroups.size}媛??댄븰`],
        displayOrder: Math.min(...languageItems.map(normalizedDisplayOrder))
    }];
}

function createLanguageTestSummaryLine(fields) {
    return joinAutoFillSummaryParts([
        fields.testName,
        fields.score,
        fields.acquiredDate,
        fields.registrationNumber
    ]);
}

function createMilitaryAutoFillGroups(items) {
    const militaryItems = items.filter((item) => String(item?.fieldKey ?? '').startsWith('military.'));
    if (militaryItems.length === 0) {
        return [];
    }
    return [{
        type: 'military-group',
        title: '\uBCD1\uC5ED',
        items: militaryItems,
        summaryLines: createMilitarySummary(militaryItems),
        displayOrder: Math.min(...militaryItems.map(normalizedDisplayOrder))
    }];
}

function createMilitarySummary(items) {
    return [
        joinAutoFillSummaryParts([
            getAutoFillValueByFieldKey(items, 'military.status'),
            labelValue('\uAD70\uBCC4', getAutoFillValueByFieldKey(items, 'military.branch')),
            getAutoFillValueByFieldKey(items, 'military.rank'),
            getAutoFillValueByFieldKey(items, 'military.dischargeType')
        ]),
        formatAutoFillPeriod(
            getAutoFillValueByFieldKey(items, 'military.enlistmentDate'),
            getAutoFillValueByFieldKey(items, 'military.dischargeDate')
        ),
        joinAutoFillSummaryParts([
            labelValue('\uC7A5\uC560', getAutoFillValueByFieldKey(items, 'military.isDisabled')),
            labelValue('\uBCF4\uD6C8', getAutoFillValueByFieldKey(items, 'military.isVeteran'))
        ])
    ].filter(Boolean);
}

function createCareerAutoFillGroups(items) {
    const careerGroups = new Map();
    const careerItems = [];
    for (const item of items) {
        const match = String(item?.fieldKey ?? '').match(/^career\.careers\.(\d+)\.(.+)$/);
        if (!match) continue;
        const [, index, field] = match;
        if (!careerGroups.has(index)) {
            careerGroups.set(index, { items: [], fields: {}, displayOrder: normalizedDisplayOrder(item) });
        }
        const group = careerGroups.get(index);
        group.items.push(item);
        group.fields[field] = item.value;
        group.displayOrder = Math.min(group.displayOrder, normalizedDisplayOrder(item));
        careerItems.push(item);
    }
    if (careerItems.length === 0) {
        return [];
    }
    const summaryLines = [...careerGroups.entries()]
        .sort(([left], [right]) => Number(left) - Number(right))
        .map(([index, group]) => createCareerSummaryLine(group.fields, index))
        .filter(Boolean);
    return [{
        type: 'career-group',
        title: '\uACBD\uB825',
        items: careerItems,
        itemCount: careerGroups.size,
        summaryLines: summaryLines.length > 0 ? summaryLines : [`${careerGroups.size}媛??쎈젰`],
        displayOrder: Math.min(...careerItems.map(normalizedDisplayOrder))
    }];
}

function createCareerSummaryLine(fields, index) {
    return joinAutoFillSummaryParts([
        fields.companyName ? `${Number(index) + 1}. ${fields.companyName}` : '',
        fields.employmentType,
        fields.roleName || fields.position,
        formatAutoFillPeriod(fields.startDate, fields.endDate),
        fields.isEmployed
    ]);
}

function createHighSchoolSummary(items) {
    return [
        joinAutoFillSummaryParts([
            labelValue('\uD559\uAD50\uBA85', getAutoFillValueByFieldKey(items, 'education.highSchool.schoolName')),
            labelValue('\uC878\uC5C5', getAutoFillValueByFieldKey(items, 'education.highSchool.graduationStatus')),
            labelValue('\uC18C\uC7AC\uC9C0', getAutoFillValueByFieldKey(items, 'education.highSchool.location')),
            labelValue('\uACC4\uC5F4', getAutoFillValueByFieldKey(items, 'education.highSchool.track'))
        ]),
        formatAutoFillPeriod(
            getAutoFillValueByFieldKey(items, 'education.highSchool.admissionDate'),
            getAutoFillValueByFieldKey(items, 'education.highSchool.graduationDate')
        )
    ].filter(Boolean);
}

function createUniversitySummary(items) {
    return [
        joinAutoFillSummaryParts([
            labelValue('\uD559\uAD50\uBA85', getAutoFillValueBySuffix(items, 'schoolName')),
            getAutoFillValueBySuffix(items, 'degreeType'),
            getAutoFillValueBySuffix(items, 'graduationStatus'),
            getAutoFillValueBySuffix(items, 'campusType'),
            labelValue('\uC18C\uC7AC\uC9C0', getAutoFillValueBySuffix(items, 'location'))
        ]),
        formatAutoFillPeriod(
            getAutoFillValueBySuffix(items, 'admissionDate'),
            getAutoFillValueBySuffix(items, 'graduationDate')
        )
    ].filter(Boolean);
}

function createMajorSummary(majorItems, universityItems) {
    const majorGroups = new Map();
    for (const item of majorItems) {
        const match = String(item?.fieldKey ?? '').match(/^education\.universities\.\d+\.majors\.(\d+)\.(.+)$/);
        if (!match) continue;
        const [, index, field] = match;
        if (!majorGroups.has(index)) {
            majorGroups.set(index, {});
        }
        majorGroups.get(index)[field] = item.value;
    }
    const lines = [...majorGroups.entries()]
        .sort(([left], [right]) => Number(left) - Number(right))
        .map(([index, fields]) => joinAutoFillSummaryParts([
            fields.majorName ? `${Number(index) + 1}\uC804\uACF5 ${fields.majorName}` : '',
            fields.majorType,
            fields.dayNight,
            fields.majorCategory
        ]))
        .filter(Boolean);
    const departmentCategory = getAutoFillValueByFieldKey(universityItems, 'education.universities.0.majorCategory');
    if (departmentCategory) {
        lines.push(labelValue('\uD559\uACFC\uACC4\uC5F4', departmentCategory));
    }
    return lines;
}

function createGradeSummary(items) {
    const grade = getAutoFillValueBySuffix(items, 'grade');
    const scale = getAutoFillValueBySuffix(items, 'gradeScale');
    const credits = getAutoFillValueBySuffix(items, 'credits');
    return [
        joinAutoFillSummaryParts([
            grade && scale ? `\uD3C9\uC810 ${grade} / ${scale}` : labelValue('\uD3C9\uC810', grade),
            labelValue('\uC774\uC218\uD559\uC810', credits)
        ])
    ].filter(Boolean);
}

function isEducationGradeField(fieldKey) {
    return /\.(grade|gradeScale|credits)$/.test(fieldKey);
}

function getAutoFillValueByFieldKey(items, fieldKey) {
    return normalizeInput(String(items.find((item) => item?.fieldKey === fieldKey)?.value ?? ''));
}

function getAutoFillValueBySuffix(items, suffix) {
    return normalizeInput(String(items.find((item) => String(item?.fieldKey ?? '').endsWith(`.${suffix}`))?.value ?? ''));
}

function labelValue(label, value) {
    return value ? `${label} ${value}` : '';
}

function joinAutoFillSummaryParts(parts) {
    return parts.filter(Boolean).join(' \u00B7 ');
}

function formatAutoFillPeriod(start, end) {
    if (start && end) return `${start} ~ ${end}`;
    return start || end || '';
}

function createAutoFillGroupCard(group) {
    const item = document.createElement('li');
    item.className = 'autofill-group-card';
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.className = 'autofill-group-summary';
    const titleRow = document.createElement('div');
    titleRow.className = 'autofill-group-title-row';
    const title = document.createElement('strong');
    title.textContent = group.title;
    const count = document.createElement('span');
    count.className = 'autofill-group-meta';
    count.textContent = `${group.itemCount ?? group.items.length}개`;
    titleRow.append(title, count);
    const summaryText = document.createElement('div');
    summaryText.className = 'autofill-group-lines';
    for (const line of group.summaryLines) {
        const lineElement = document.createElement('span');
        lineElement.textContent = line;
        summaryText.append(lineElement);
    }
    summary.append(titleRow, summaryText);
    const detailsList = document.createElement('div');
    detailsList.className = 'autofill-group-details';
    for (const source of group.items) {
        const mapped = getPrimaryAutoFillDisplay(source, true);
        const row = document.createElement('span');
        row.className = 'autofill-group-detail-row';
        const label = document.createElement('small');
        label.textContent = mapped.title ?? '';
        const value = document.createElement('em');
        value.textContent = mapped.body ?? '';
        row.append(label, value);
        detailsList.append(row);
    }
    details.append(summary, detailsList);
    item.append(details);
    return item;
}

function createAutoFillResultListItem(source, mapper) {
    const mapped = mapper(source);
    const item = document.createElement('li');
    if (mapped.variant) {
        item.classList.add(`is-${mapped.variant}`);
    }
    const heading = document.createElement('div');
    const title = document.createElement('strong');
    heading.className = 'autofill-result-heading';
    const body = document.createElement('span');
    body.className = 'autofill-result-body';
    if (mapped.preserveBodyLines) {
        body.classList.add('is-multiline');
    }
    title.textContent = mapped.title ?? '';
    heading.append(title);
    if (mapped.badge) {
        const badge = document.createElement('em');
        badge.className = 'autofill-result-badge';
        badge.textContent = mapped.badge;
        heading.append(badge);
    }
    if (mapped.actionValue) {
        const action = document.createElement('button');
        action.className = 'autofill-result-copy-button';
        action.type = 'button';
        action.textContent = mapped.actionLabel ?? '\uBCF5\uC0AC';
        action.setAttribute('aria-label', mapped.actionAriaLabel ?? action.textContent);
        action.addEventListener('click', async () => {
            const copied = await copyTextToClipboard(mapped.actionValue);
            if (!copied) {
                action.textContent = '\uC2E4\uD328';
                return;
            }
            action.textContent = mapped.actionDoneLabel ?? '\uBCF5\uC0AC\uB428';
            action.disabled = true;
            setTimeout(() => {
                action.textContent = mapped.actionLabel ?? '\uBCF5\uC0AC';
                action.disabled = false;
            }, 1200);
        });
        heading.append(action);
    }
    body.textContent = mapped.body ?? '';
    item.append(heading, body);
    if (mapped.value) {
        const valueRow = document.createElement('span');
        const valueLabel = document.createElement('small');
        const valueText = document.createElement('code');
        valueRow.className = 'autofill-result-value';
        valueLabel.textContent = mapped.valueLabel ?? '\uAC12';
        valueText.textContent = mapped.value;
        valueRow.append(valueLabel, valueText);
        item.append(valueRow);
    }
    if (mapped.note) {
        const note = document.createElement('span');
        note.className = 'autofill-result-note';
        note.textContent = mapped.note;
        item.append(note);
    }
    return item;
}

function isUserVisibleAutoFillItem(item) {
    return !isSectionOpenItem(item);
}

function isSectionOpenItem(item) {
    return Boolean(item?.sectionOpenControl) || String(item?.fieldKey ?? '').endsWith('.open');
}

function getAutofillFailureDisplay(item) {
    const reason = item?.reason;
    const fieldKey = item?.fieldKey ?? '';
    if (reason === 'tailored_activity_required') {
        return {
            variant: 'action-needed',
            badge: '직무 맞춤 필요',
            body: '아래 복사 필요 항목에서 활동을 골라 지원 직무에 맞게 붙여넣어 주세요.'
        };
    }
    if (reason === 'missing_profile_value') {
        return {
            variant: 'profile-missing',
            badge: '\uC11C\uBE44\uC2A4\uC5D0 \uC5C6\uB294 \uC815\uBCF4',
            body: '\uB0B4 \uC11C\uBE44\uC2A4\uC5D0\uC11C \uC785\uB825\uD558\uC9C0 \uC54A\uC740 \uC815\uBCF4\uB77C \uC790\uB3D9\uC73C\uB85C \uB123\uC744 \uC218 \uC5C6\uC5B4\uC694. EZ-ONE\uC5D0 \uAC12\uC744 \uCD94\uAC00\uD558\uBA74 \uB2E4\uC74C\uBD80\uD130 \uC790\uB3D9 \uC785\uB825\uB429\uB2C8\uB2E4.'
        };
    }
    return {
        body: getAutofillFailureMessage(item)
    };
}

function getAutofillFailureMessage(itemOrReason) {
    const reason = typeof itemOrReason === 'string' ? itemOrReason : itemOrReason?.reason;
    const fieldKey = typeof itemOrReason === 'string' ? '' : itemOrReason?.fieldKey ?? '';
    const value = typeof itemOrReason === 'string' ? '' : normalizeInput(String(itemOrReason?.value ?? ''));
    if (reason === 'disabled_control' && fieldKey.includes('address')) {
        return value
            ? '\uC8FC\uC18C \uAC80\uC0C9 \uD6C4 \uBCF5\uC0AC \uD6C4\uBCF4\uC5D0\uC11C \uBD99\uC5EC\uB123\uC5B4 \uC8FC\uC138\uC694.'
            : '\uC9C0\uC6D0\uC11C\uC5D0\uC11C \uC9C1\uC811 \uD655\uC778\uD574 \uC8FC\uC138\uC694.';
    }
    if (reason === 'essay_or_long_text') {
        return '자기소개서 또는 장문 입력칸은 자동 입력하지 않았습니다. 직접 검토해 주세요.';
    }
    if (reason === 'manual_free_text') {
        return '기업/직무에 맞춰 직접 작성해 주세요.';
    }
    if (reason === 'manual_add_section') {
        return '필요하면 화면에서 추가해 주세요.';
    }
    if (reason === 'select_option_not_found') {
        if (/^certificates\.certificates\.\d+\.certificateName$/.test(fieldKey)) {
            return '자격증 검색 결과에서 같은 자격증명을 선택하지 못했습니다. 표기가 다를 수 있어 복사 필요 항목을 확인해 주세요.';
        }
        return '선택 목록에서 일치하는 항목을 찾지 못했습니다. 복사 필요 항목을 확인하거나 직접 선택해 주세요.';
    }
    if (reason === 'control_not_ready') {
        return '\uC785\uB825\uCE78\uC774 \uC544\uC9C1 \uC5F4\uB9AC\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4. \uD56D\uBAA9\uC744 \uC5F0 \uB4A4 \uB2E4\uC2DC \uC778\uC2DD\uC744 \uB20C\uB7EC\uC8FC\uC138\uC694.';
    }
    if (reason === 'apply_failed') {
        return '\uC790\uB3D9 \uC785\uB825 \uC911 \uBB38\uC81C\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4. \uB2E4\uC2DC \uC778\uC2DD \uD6C4 \uC7AC\uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.';
    }
    if (reason === 'missing_profile_value') {
        return '\uC11C\uB958 \uC785\uB825 \uC815\uBCF4\uC5D0 \uAC12\uC744 \uCD94\uAC00\uD574 \uC8FC\uC138\uC694.';
    }
    if (reason === 'unsupported_profile_field') {
        return '\uC9C0\uC6D0\uC11C\uC5D0\uC11C \uC9C1\uC811 \uC785\uB825\uD574 \uC8FC\uC138\uC694.';
    }
    if (reason === 'required_field') {
        return '지원서의 필수 입력 항목입니다. 직접 입력하거나 확인해 주세요.';
    }
    if (reason === 'tailored_activity_required') {
        return '활동은 지원 직무에 맞게 선택해 붙여넣어 주세요.';
    }
    if (reason === 'disabled_control') {
        if (fieldKey.includes('address')) {
            return value
                ? '주소 검색 후 복사 필요 항목에서 붙여넣어 주세요.'
                : '지원서에서 직접 확인해 주세요.';
        }
        return '지원서에서 직접 확인해 주세요.';
    }
    return '매칭되는 서류 정보를 찾지 못했습니다. 복사 필요 항목에서 붙여넣어 주세요.';
}

function renderResultList(list, items, mapper, emptyText) {
    if (items.length === 0) {
        const item = document.createElement('li');
        item.className = 'is-empty';
        item.textContent = emptyText;
        list.replaceChildren(item);
        return;
    }
    list.replaceChildren(...items.map((source) => {
        const mapped = mapper(source);
        const item = document.createElement('li');
        if (mapped.variant) {
            item.classList.add(`is-${mapped.variant}`);
        }
        const heading = document.createElement('div');
        const title = document.createElement('strong');
        heading.className = 'autofill-result-heading';
        const body = document.createElement('span');
        body.className = 'autofill-result-body';
        if (mapped.preserveBodyLines) {
            body.classList.add('is-multiline');
        }
        title.textContent = mapped.title ?? '';
        heading.append(title);
        if (mapped.badge) {
            const badge = document.createElement('em');
            badge.className = 'autofill-result-badge';
            badge.textContent = mapped.badge;
            heading.append(badge);
        }
        if (mapped.actionValue) {
            const action = document.createElement('button');
            action.className = 'autofill-result-copy-button';
            action.type = 'button';
            action.textContent = mapped.actionLabel ?? '\uBCF5\uC0AC';
            action.setAttribute('aria-label', mapped.actionAriaLabel ?? action.textContent);
            action.addEventListener('click', async () => {
                const copied = await copyTextToClipboard(mapped.actionValue);
                if (!copied) {
                    action.textContent = '\uC2E4\uD328';
                    return;
                }
                action.textContent = mapped.actionDoneLabel ?? '\uBCF5\uC0AC\uB428';
                action.disabled = true;
                setTimeout(() => {
                    action.textContent = mapped.actionLabel ?? '\uBCF5\uC0AC';
                    action.disabled = false;
                }, 1200);
            });
            heading.append(action);
        }
        body.textContent = mapped.body ?? '';
        item.append(heading, body);
        if (mapped.value) {
            const valueRow = document.createElement('span');
            const valueLabel = document.createElement('small');
            const valueText = document.createElement('code');
            valueRow.className = 'autofill-result-value';
            valueLabel.textContent = mapped.valueLabel ?? '값';
            valueText.textContent = mapped.value;
            valueRow.append(valueLabel, valueText);
            item.append(valueRow);
        }
        if (mapped.note) {
            const note = document.createElement('span');
            note.className = 'autofill-result-note';
            note.textContent = mapped.note;
            item.append(note);
        }
        return item;
    }));
}

async function copyTextToClipboard(value) {
    const text = normalizeInput(String(value ?? ''));
    if (!text) {
        return false;
    }
    if (window.parent !== window && copyTextWithFallback(text)) {
        return true;
    }
    try {
        await navigator.clipboard.writeText(text);
        return true;
    }
    catch {
        return copyTextWithFallback(text);
    }
}

function copyTextWithFallback(text) {
    const input = document.createElement('textarea');
    input.value = text;
    input.setAttribute('readonly', '');
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.append(input);
    input.select();
    try {
        return document.execCommand('copy');
    }
    finally {
        input.remove();
    }
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

async function handleAuthExpired(error, continuation = null) {
    if (!isAuthExpiredError(error)) {
        return false;
    }
    await clearExtensionSession();
    hasExtensionSession = false;
    await rememberPendingLoginContinuation(continuation);
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
    lastReportedPanelHeight = 0;
    schedulePanelResize();
}

function showFeatureSelection() {
    showPanel(featurePanel);
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
        return '공고 상세 화면에서 실행해 주세요';
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
    for (const id of ['home-link', 'web-link', 'feature-web-link']) {
        const link = requireElement(id);
        link.href = webAppUrl;
    }
}

function setupPanelAutoResize() {
    if (window.parent === window) {
        return;
    }
    if (typeof ResizeObserver === 'function') {
        const observer = new ResizeObserver(() => {
            schedulePanelResize();
        });
        [
            document.querySelector('.popup-header'),
            statusPanel,
            loginPanel,
            featurePanel,
            previewPanel,
            resultPanel,
            documentResultPanel,
            roleOptions,
            essayQuestionList
        ].filter(Boolean).forEach((item) => observer.observe(item));
    }
    window.addEventListener('load', schedulePanelResize);
    schedulePanelResize();
}

function schedulePanelResize() {
    if (window.parent === window) {
        return;
    }
    if (panelResizeFrame !== null) {
        cancelAnimationFrame(panelResizeFrame);
    }
    panelResizeFrame = requestAnimationFrame(() => {
        panelResizeFrame = null;
        reportPanelHeight();
    });
}

function reportPanelHeight() {
    const activePanel = [statusPanel, loginPanel, featurePanel, previewPanel, resultPanel, documentResultPanel]
        .find((item) => !item.hidden);
    if (!activePanel) {
        return;
    }
    const popupShell = document.querySelector('.popup-shell');
    if (!popupShell) {
        return;
    }
    const bodyStyle = getComputedStyle(document.body);
    const shellStyle = getComputedStyle(popupShell);
    const header = document.querySelector('.popup-header');
    const bodyPadding = parsePixelValue(bodyStyle.paddingTop) + parsePixelValue(bodyStyle.paddingBottom);
    const shellGap = parsePixelValue(shellStyle.rowGap || shellStyle.gap);
    const headerHeight = header?.scrollHeight ?? header?.getBoundingClientRect().height ?? 0;
    const measuredPanelHeight = measureIntrinsicPanelHeight(activePanel);
    const panelHeight = activePanel === previewPanel
        ? Math.max(measuredPanelHeight, activePanel.scrollHeight)
        : measuredPanelHeight;
    const height = Math.ceil(bodyPadding + headerHeight + shellGap + panelHeight + 2);
    if (Math.abs(height - lastReportedPanelHeight) < PANEL_RESIZE_EPSILON_PX) {
        return;
    }
    lastReportedPanelHeight = height;
    window.parent.postMessage({
        type: PANEL_RESIZE_MESSAGE,
        height
    }, '*');
}

function measureIntrinsicPanelHeight(panel) {
    const panelRect = panel.getBoundingClientRect();
    const panelStyle = getComputedStyle(panel);
    const paddingTop = parsePixelValue(panelStyle.paddingTop);
    const paddingBottom = parsePixelValue(panelStyle.paddingBottom);
    const borderTop = parsePixelValue(panelStyle.borderTopWidth);
    const borderBottom = parsePixelValue(panelStyle.borderBottomWidth);
    const visibleChildren = Array.from(panel.children).filter((child) => {
        return getComputedStyle(child).display !== 'none';
    });
    if (visibleChildren.length === 0) {
        return Math.ceil(borderTop + paddingTop + paddingBottom + borderBottom);
    }
    const contentBottom = visibleChildren.reduce((bottom, child) => {
        const childStyle = getComputedStyle(child);
        const childRect = child.getBoundingClientRect();
        const childBottom = childRect.bottom - panelRect.top + panel.scrollTop + parsePixelValue(childStyle.marginBottom);
        return Math.max(bottom, childBottom);
    }, borderTop + paddingTop);
    return Math.ceil(contentBottom + paddingBottom + borderBottom);
}

function parsePixelValue(value) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function requireElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        throw new Error(`Missing element: ${id}`);
    }
    return element;
}
