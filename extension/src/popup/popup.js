import { createExtensionJobApi } from '../shared/api/extensionJobApi';
import { createExtensionDocumentProfileApi } from '../shared/api/extensionDocumentProfileApi';
import {
    ACCESS_TOKEN_KEY,
    PENDING_EXTENSION_CONTINUATION_KEY,
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
const UNSUPPORTED_JOB_PAGE_MESSAGE = '채용공고 목록이나 캘린더에서는 저장할 공고를 정확히 찾을 수 없어요.';
const JOB_EXTRACTOR_VERSION = '2026-06-19-jasoseol-selected-root-v13';
const POSTING_WATCH_INTERVAL_MS = 1200;
const LOGIN_SESSION_POLL_INTERVAL_MS = 800;
const LOGIN_SESSION_POLL_TIMEOUT_MS = 120000;
const PANEL_RESIZE_MESSAGE = 'EZONE_PANEL_RESIZE';
const PANEL_RESIZE_EPSILON_PX = 2;
const APPLICATION_FORM_CHANGED_MESSAGE = 'EZONE_APPLICATION_FORM_CHANGED';
const DOCUMENT_AUTOFILL_REFRESH_DEBOUNCE_MS = 450;
const DOCUMENT_AUTOFILL_APPLY_SUPPRESS_MS = 1400;
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
let currentPosting = null;
let pendingDocumentAutoFillProfile = null;
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
let documentAutoFillRefreshTimer = null;
let isRefreshingDocumentAutoFill = false;
let ignoreDocumentAutoFillChangesUntil = 0;
let lastDocumentAutoFillSignature = null;
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
setupPanelAutoResize();
chrome.storage.onChanged?.addListener(handleSessionStorageChanged);
chrome.runtime.onMessage?.addListener(handleRuntimeMessage);
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
    void loadPreview({ showUnsupportedMessage: true });
});
documentInputModeButton.addEventListener('click', () => {
    void previewDocumentAutoFill();
});
autofillApplyButton.addEventListener('click', () => {
    void applyDocumentAutoFill();
});
autofillRescanButton.addEventListener('click', () => {
    pendingDocumentAutoFillProfile = null;
    void previewDocumentAutoFill();
});
reloadPreviewButton.addEventListener('click', () => {
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
    const session = await getStoredSession(chrome.storage.local);
    if (!session) {
        hasExtensionSession = false;
        showPanel(loginPanel);
        return;
    }
    hasExtensionSession = true;
    await resumePendingExtensionAction();
}

async function handleSessionStorageChanged(changes, areaName) {
    if (!waitingForWebLogin || areaName !== 'local' || !hasSessionTokenChange(changes)) {
        return;
    }
    const session = await getStoredSession(chrome.storage.local);
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
    const session = await getStoredSession(chrome.storage.local);
    if (!session) {
        return;
    }
    await resumeAfterWebLogin();
}

async function resumeAfterWebLogin() {
    stopLoginSessionPolling();
    waitingForWebLogin = false;
    hasExtensionSession = true;
    await resumePendingExtensionAction();
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
        const result = await chrome.tabs.sendMessage(tab.id, {
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
        const result = await chrome.tabs.sendMessage(tab.id, {
            type: 'EZONE_APPLY_APPLICATION_AUTOFILL',
            profile
        });
        ignoreDocumentAutoFillChangesUntil = Date.now() + DOCUMENT_AUTOFILL_APPLY_SUPPRESS_MS;
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
        autofillApplyButton.textContent = '확인 후 자동 입력';
    }
}

function handleRuntimeMessage(message, sender) {
    if (message?.type !== APPLICATION_FORM_CHANGED_MESSAGE) {
        return false;
    }
    if (documentResultPanel.hidden || Date.now() < ignoreDocumentAutoFillChangesUntil) {
        return false;
    }
    scheduleDocumentAutoFillRefresh({
        sourceTabId: sender?.tab?.id,
        signature: message.signature
    });
    return false;
}

function scheduleDocumentAutoFillRefresh({ sourceTabId, signature } = {}) {
    if (signature && signature === lastDocumentAutoFillSignature) {
        return;
    }
    if (documentAutoFillRefreshTimer !== null) {
        clearTimeout(documentAutoFillRefreshTimer);
    }
    documentAutoFillRefreshTimer = setTimeout(() => {
        documentAutoFillRefreshTimer = null;
        void refreshDocumentAutoFillPreview({ sourceTabId, signature });
    }, DOCUMENT_AUTOFILL_REFRESH_DEBOUNCE_MS);
}

async function refreshDocumentAutoFillPreview({ sourceTabId, signature } = {}) {
    if (isRefreshingDocumentAutoFill) {
        return;
    }
    try {
        isRefreshingDocumentAutoFill = true;
        const tab = await getActiveTab();
        if (!tab.id || (sourceTabId && tab.id !== sourceTabId)) {
            return;
        }
        const profile = pendingDocumentAutoFillProfile ?? await documentProfileApi.getDocumentProfile();
        pendingDocumentAutoFillProfile = profile;
        await ensureContentScriptLoaded(tab.id, 'assets/applicationAutoFill.js', () => Boolean(window.ezOneAutoFillApplicationLoaded));
        const result = await chrome.tabs.sendMessage(tab.id, {
            type: 'EZONE_PREVIEW_APPLICATION_AUTOFILL',
            profile
        });
        lastDocumentAutoFillSignature = signature ?? null;
        renderAutoFillResult(result);
        showPanel(documentResultPanel);
    }
    catch (error) {
        if (await handleAuthExpired(error, 'documentAutoFill')) {
            return;
        }
        console.warn('EZ-ONE document autofill refresh failed', error);
    }
    finally {
        isRefreshingDocumentAutoFill = false;
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
    const primaryItems = uniqueAutoFillItems((isPreview ? planned : filled).filter(isUserVisibleAutoFillItem));
    const primaryFieldKeys = new Set(primaryItems.map((item) => item?.fieldKey).filter(Boolean));
    const visibleCopyCandidates = copyCandidates.filter((item) => !primaryFieldKeys.has(item?.key));
    documentResultTitle.textContent = isPreview ? '입력 전 확인' : '입력이 끝났습니다';
    autofillFilledLabel.textContent = isPreview ? '입력 예정' : '입력됨';
    autofillFilledHeading.textContent = isPreview ? '입력 예정' : '자동 입력됨';
    autofillFilledCaption.textContent = '';
    autofillFilledCaption.hidden = true;
    autofillApplyButton.hidden = !isPreview;
    if (autofillApplyButton.parentElement) {
        autofillApplyButton.parentElement.hidden = false;
    }
    autofillApplyButton.disabled = isPreview && primaryItems.length === 0;
    autofillFilledCount.textContent = String(primaryItems.length);
    autofillReviewCount.textContent = String(failed.length);
    autofillCopyCount.textContent = String(visibleCopyCandidates.length);
    autofillSummary.textContent = isPreview
        ? `${primaryItems.length}개 항목을 찾았습니다.`
        : `${primaryItems.length}개 항목을 입력했습니다. 확인 필요 ${failed.length}개.`;
    renderResultList(autofillFilledList, primaryItems, (item) => getPrimaryAutoFillDisplay(item, isPreview), isPreview ? '입력 예정 항목이 없습니다.' : '자동 입력된 항목이 없습니다.');
    renderResultList(autofillFailedList, failed, (item) => ({
        title: item.label ?? '알 수 없는 입력칸',
        ...getAutofillFailureDisplay(item)
    }), '실패 항목이 없습니다.');
    renderResultList(autofillCopyList, visibleCopyCandidates.slice(0, 12), (item) => ({
        title: item.label,
        body: item.value,
        actionLabel: '\uBCF5\uC0AC',
        actionDoneLabel: '\uBCF5\uC0AC\uB428',
        actionValue: item.value,
        actionAriaLabel: `${item.label ?? '\uAC12'} \uBCF5\uC0AC`
    }), '복사할 후보가 없습니다.');
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

function isUserVisibleAutoFillItem(item) {
    return !isSectionOpenItem(item);
}

function isSectionOpenItem(item) {
    return Boolean(item?.sectionOpenControl) || String(item?.fieldKey ?? '').endsWith('.open');
}

function getAutofillFailureDisplay(item) {
    const reason = item?.reason;
    const fieldKey = item?.fieldKey ?? '';
    const value = normalizeInput(String(item?.value ?? ''));
    if (reason === 'disabled_control' && fieldKey.includes('address')) {
        return {
            variant: 'action-needed',
            badge: '\uC8FC\uC18C \uAC80\uC0C9 \uD544\uC694',
            body: value
                ? '\uC8FC\uC18C \uAC80\uC0C9 \uD6C4 \uBCF5\uC0AC \uD6C4\uBCF4\uC5D0\uC11C \uBD99\uC5EC\uB123\uC5B4 \uC8FC\uC138\uC694.'
                : '\uC9C0\uC6D0\uC11C\uC5D0\uC11C \uC9C1\uC811 \uD655\uC778\uD574 \uC8FC\uC138\uC694.'
        };
    }
    if (reason === 'tailored_activity_required') {
        return {
            variant: 'action-needed',
            badge: '직무 맞춤 필요',
            body: '아래 복사 후보에서 활동을 골라 지원 직무에 맞게 붙여넣어 주세요.'
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
    if (reason === 'essay_or_long_text') {
        return '자기소개서 또는 장문 입력칸은 자동 입력하지 않았습니다. 직접 검토해 주세요.';
    }
    if (reason === 'select_option_not_found') {
        return '선택 가능한 옵션과 내 서류 정보가 맞지 않습니다. 직접 선택해 주세요.';
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
    if (reason === 'tailored_activity_required') {
        return '활동은 지원 직무에 맞게 선택해 붙여넣어 주세요.';
    }
    if (reason === 'disabled_control') {
        if (fieldKey.includes('address')) {
            return value
                ? '주소 검색 후 복사 후보에서 붙여넣어 주세요.'
                : '지원서에서 직접 확인해 주세요.';
        }
        return '지원서에서 직접 확인해 주세요.';
    }
    return '매칭되는 서류 정보를 찾지 못했습니다. 복사 후보에서 붙여넣어 주세요.';
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
    const panelHeight = measureIntrinsicPanelHeight(activePanel);
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
