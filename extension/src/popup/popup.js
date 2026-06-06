import { createExtensionJobApi } from '../shared/api/extensionJobApi';
import { createExtensionDocumentProfileApi } from '../shared/api/extensionDocumentProfileApi';
import { ACCESS_TOKEN_KEY, buildWebLoginUrl, getStoredSession } from '../shared/auth/extensionAuth';
import './popup.css';

const apiBaseUrl = import.meta.env.VITE_EXTENSION_API_BASE_URL ?? 'http://localhost:8080/api';
const webAppUrl = import.meta.env.VITE_EXTENSION_WEB_APP_URL ?? 'http://localhost:5173';
const statusPanel = requireElement('status-panel');
const loginPanel = requireElement('login-panel');
const featurePanel = requireElement('feature-panel');
const previewPanel = requireElement('preview-panel');
const resultPanel = requireElement('result-panel');
const documentResultPanel = requireElement('document-result-panel');
const statusMessage = requireElement('status-message');
const loginButton = requireElement('login-button');
const jobSaveModeButton = requireElement('job-save-mode-button');
const documentInputModeButton = requireElement('document-input-mode-button');
const saveButton = requireElement('save-button');
const companyNameInput = requireElement('company-name-input');
const positionTitleInput = requireElement('position-title-input');
const deadlineLabelInput = requireElement('deadline-label-input');
const roleOptions = requireElement('role-options');
const basketLink = requireElement('basket-link');
const savedJobList = requireElement('saved-job-list');
const autofillSummary = requireElement('autofill-summary');
const autofillFilledList = requireElement('autofill-filled-list');
const autofillFailedList = requireElement('autofill-failed-list');
const autofillCopyList = requireElement('autofill-copy-list');
let currentPosting = null;

const jobApi = createExtensionJobApi({
    apiBaseUrl,
    getAccessToken: getStoredAccessToken
});
const documentProfileApi = createExtensionDocumentProfileApi({
    apiBaseUrl,
    getAccessToken: getStoredAccessToken
});

setStaticLinks();
loginButton.addEventListener('click', async () => {
    const tab = await getActiveTab();
    const loginUrl = buildWebLoginUrl({
        webAppUrl,
        currentUrl: tab.url ?? ''
    });
    await chrome.tabs.create({ url: loginUrl.toString() });
    setStatus('로그인 완료 후 팝업을 다시 열어 주세요.');
});
jobSaveModeButton.addEventListener('click', () => {
    void loadPreview();
});
documentInputModeButton.addEventListener('click', () => {
    void runDocumentAutoFill();
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
        saveButton.disabled = true;
        saveButton.textContent = '저장 중';
        const savedJobs = await jobApi.save({
            ...currentPosting,
            companyName: normalizeInput(companyNameInput.value),
            positionTitle: normalizeInput(positionTitleInput.value),
            deadlineLabel: normalizeInput(deadlineLabelInput.value),
            selectedRoles
        });
        const firstWorkspaceId = savedJobs[0]?.workspaceId;
        basketLink.href = `${webAppUrl}/basket`;
        requireElement('result-message').textContent = firstWorkspaceId
            ? '선택한 직무가 장바구니와 워크스페이스에 저장되었습니다.'
            : '이미 저장된 공고를 확인했습니다.';
        renderSavedJobs(savedJobs, currentPosting);
        showPanel(resultPanel);
    }
    catch (error) {
        setStatus(error instanceof Error ? error.message : '저장에 실패했습니다.', true);
    }
    finally {
        saveButton.disabled = false;
        saveButton.textContent = '선택한 공고 장바구니에 담기';
    }
});

void init();

async function init() {
    const session = await getStoredSession(chrome.storage.local);
    if (!session) {
        showPanel(loginPanel);
        return;
    }
    showPanel(featurePanel);
}

async function loadPreview() {
    try {
        setStatus('현재 페이지에서 공고 정보를 읽고 있습니다.');
        const tab = await getActiveTab();
        if (!tab.id || !tab.url?.includes('jasoseol.com')) {
            setStatus('자소설닷컴 공고 페이지에서 사용할 수 있습니다.', true);
            return;
        }
        const posting = await chrome.tabs.sendMessage(tab.id, {
            type: 'EZONE_EXTRACT_JOB'
        });
        currentPosting = posting;
        await jobApi.preview(posting);
        renderPosting(posting);
        showPanel(previewPanel);
    }
    catch (error) {
        setStatus(error instanceof Error ? error.message : '공고 정보를 추출하지 못했습니다.', true);
    }
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
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['assets/applicationAutoFill.js']
        });
        const result = await chrome.tabs.sendMessage(tab.id, {
            type: 'EZONE_AUTOFILL_APPLICATION',
            profile
        });
        renderAutoFillResult(result);
        showPanel(documentResultPanel);
    }
    catch (error) {
        setStatus(error instanceof Error ? error.message : '서류 정보 자동 입력에 실패했습니다.', true);
    }
}

function renderPosting(posting) {
    companyNameInput.value = posting.companyName ?? '';
    positionTitleInput.value = posting.positionTitle ?? '';
    deadlineLabelInput.value = posting.deadlineLabel ?? '';
    const roles = posting.roleOptions.length > 0
        ? posting.roleOptions
        : [posting.positionTitle ?? '선택 직무'];
    roleOptions.replaceChildren(...roles.map((role, index) => {
        const label = document.createElement('label');
        const input = document.createElement('input');
        const labelText = document.createElement('span');
        input.type = 'checkbox';
        input.value = role;
        input.checked = index === 0;
        labelText.textContent = role;
        label.append(input, labelText);
        return label;
    }));
}

function normalizeInput(value) {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
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

function showPanel(panel) {
    for (const item of [statusPanel, loginPanel, featurePanel, previewPanel, resultPanel, documentResultPanel]) {
        item.hidden = item !== panel;
    }
}

function setStatus(message, isError = false) {
    statusMessage.textContent = message;
    statusPanel.classList.toggle('is-error', isError);
    showPanel(statusPanel);
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
