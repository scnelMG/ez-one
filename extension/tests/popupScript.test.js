import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('extension popup script', () => {
    const script = readFileSync(resolve(__dirname, '../src/popup/popup.js'), 'utf-8');

    it('loads the job extractor on demand before reading the current tab', () => {
        expect(script).toContain('async function ensureContentScriptLoaded');
        expect(script).toContain('files: [file]');
        expect(script).toContain("ensureContentScriptLoaded(tabId, 'assets/jobExtractor.js'");
        expect(script).toContain('window.ezOneExtractJobPosting');
        expect(script).toContain('JOB_EXTRACTOR_VERSION');
        expect(script).toContain('window.ezOneJobExtractorVersion === JOB_EXTRACTOR_VERSION');
        expect(script).toContain('void loadEssayQuestionsForSelectedRole();');
        expect(script).toContain('function loadEssayQuestionsForSelectedRole');
        expect(script).toContain('function extractEssayQuestionsForRole');
        expect(script).toContain('withEssayQuestions: true');
        expect(script).toContain('targetRoles: [targetRole]');
        expect(script).toContain('hoverDelayMs: 50');
        expect(script).toContain('maxEssayTriggers: 1');
        expect(script).not.toContain("type: 'EZONE_EXTRACT_JOB'");
    });

    it('does not inject content scripts again when they are already loaded', () => {
        expect(script).toContain('loaded?.result');
        expect(script).toContain('const contentScriptLoadPromises = new Map();');
        expect(script).toContain('contentScriptLoadPromises.has(loadKey)');
        expect(script).toContain('async function loadContentScript');
        expect(script).toContain("ensureContentScriptLoaded(tab.id, 'assets/applicationAutoFill.js'");
        expect(script).toContain('window.ezOneAutoFillApplicationLoaded');
    });

    it('shows a job-page notice before extraction on unsupported pages', () => {
        expect(script).toContain('function isSupportedJobPostingPage');
        expect(script).toContain('const UNSUPPORTED_JOB_PAGE_MESSAGE');
        expect(script).toContain("parsedUrl.hostname.endsWith('jasoseol.com')");
        expect(script).toContain("parsedUrl.pathname.startsWith('/recruit/')");
        expect(script).toContain("parsedUrl.pathname === '/'");
        expect(script).toContain('function hasMinimumPostingData');
        expect(script).not.toContain("parsedUrl.pathname.startsWith('/recruit') ||");
        expect(script).toContain("parsedUrl.searchParams.has('campaignid')");
        expect(script).toContain('setStatus(UNSUPPORTED_JOB_PAGE_MESSAGE, true)');
    });

    it('returns to the login panel when the extension session expires', () => {
        expect(script).toContain('AUTH_EXPIRED_MESSAGE');
        expect(script).toContain('async function handleAuthExpired(error)');
        expect(script).toContain('await clearExtensionSession();');
        expect(script).toContain('showPanel(loginPanel);');
    });

    it('automatically resumes the popup after web login stores the extension session', () => {
        expect(script).toContain('let waitingForWebLogin = false;');
        expect(script).toContain('const LOGIN_SESSION_POLL_INTERVAL_MS');
        expect(script).toContain('chrome.storage.onChanged?.addListener(handleSessionStorageChanged);');
        expect(script).toContain('startLoginSessionPolling();');
        expect(script).toContain('async function reconcileWebLoginSession');
        expect(script).toContain('async function handleSessionStorageChanged(changes, areaName)');
        expect(script).toContain('waitingForWebLogin = false;');
        expect(script).toContain('async function resumeAfterWebLogin');
        expect(script).toContain('await loadPreview({ force: true, fallbackPanel: featurePanel });');
        expect(script).not.toContain('로그인 완료 후 팝업을 다시 열어 주세요.');
    });

    it('reports embedded popup height so the in-page panel can fit its current content', () => {
        expect(script).toContain("const PANEL_RESIZE_MESSAGE = 'EZONE_PANEL_RESIZE'");
        expect(script).toContain('setupPanelAutoResize();');
        expect(script).toContain('function setupPanelAutoResize');
        expect(script).toContain('new ResizeObserver');
        expect(script).toContain('function schedulePanelResize');
        expect(script).toContain('function reportPanelHeight');
        expect(script).toContain('window.parent.postMessage');
        expect(script).toContain('height: Math.ceil');
    });

    it('includes manually entered essay questions in the save payload', () => {
        expect(script).toContain("requireElement('essay-question-list')");
        expect(script).toContain('renderEssayQuestionInputs(questions, { showFallback: !hasNoEssayQuestions })');
        expect(script).toContain('createEssayQuestionInput');
        expect(script).toContain("document.createElement('details')");
        expect(script).toContain('essay-question-summary');
        expect(script).toContain('essay-question-preview');
        expect(script).toContain("item.addEventListener('toggle'");
        expect(script).toContain('function autoResizeEssayQuestionInput');
        expect(script).toContain("textarea.addEventListener('input'");
        expect(script).toContain('textarea.scrollHeight + 2');
        expect(script).toContain("item.scrollIntoView({ block: 'nearest', behavior: 'smooth' })");
        expect(script).toContain('getEssayQuestionRows');
        expect(script).toContain("data-max-length");
        expect(script).toContain("'.essay-question-input'");
        expect(script).toContain('collectEssayQuestions()');
        expect(script).toContain('function collectEssayQuestions()');
        expect(script).toContain('essayQuestions: collectEssayQuestions()');
    });

    it('updates the visible essay questions when the selected role changes', () => {
        expect(script).toContain("requireElement('essay-question-status')");
        expect(script).toContain('function updateEssayQuestionsForSelectedRoles');
        expect(script).toContain('function renderEssayQuestionLoading');
        expect(script).toContain('자소서 문항을 확인하고 있습니다');
        expect(script).toContain('currentPosting.roleEssayQuestions');
        expect(script).toContain('currentPosting.essayQuestionAvailability');
        expect(script).toContain('자소서 문항이 없는 공고입니다');
        expect(script).toContain('showFallback: !hasNoEssayQuestions');
        expect(script).toContain('roleEssayQuestions: buildRoleEssayQuestionsPayload(selectedRoles)');
    });

    it('renders employment type as a separate role badge', () => {
        expect(script).toContain('function parseDisplayRole');
        expect(script).toContain('role-employment-badge');
        expect(script).toContain('getEmploymentBadgeClass');
        expect(script).toContain('role-employment-badge--new');
        expect(script).toContain('role-employment-badge--career');
        expect(script).toContain('role-employment-badge--mixed');
        expect(script).toContain('role-title');
        expect(script).toContain('role-option-text');
        expect(script).toContain('계약직');
    });

    it('can read another posting without closing and reopening the extension panel', () => {
        expect(script).toContain("requireElement('reload-preview-button')");
        expect(script).not.toContain("requireElement('save-another-button')");
        expect(script).toContain("reloadPreviewButton.addEventListener('click'");
        expect(script).not.toContain("saveAnotherButton.addEventListener('click'");
        expect(script).toContain('const POSTING_WATCH_INTERVAL_MS = 1200;');
        expect(script).toContain('startPostingChangeWatcher();');
        expect(script).toContain('function startPostingChangeWatcher');
        expect(script).toContain('async function refreshPreviewWhenPostingChanges');
        expect(script).toContain('currentUrl === lastObservedPostingUrl');
        expect(script).toContain("statusMessage: '새 공고를 읽고 있습니다.'");
        expect(script).toContain("void loadPreview({ force: true, showUnsupportedMessage: true });");
        expect(script).toContain('essayQuestionRequestId += 1;');
        expect(script).toContain('(posting.essayQuestions ?? []).length > 0');
    });
});
