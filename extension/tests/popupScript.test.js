import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('extension popup script', () => {
    const script = readFileSync(resolve(__dirname, '../src/popup/popup.js'), 'utf-8');

    it('starts the web login handoff on the default local frontend port used by dev', () => {
        expect(script).toContain("const webAppUrl = import.meta.env.VITE_EXTENSION_WEB_APP_URL ?? 'http://localhost:5173'");
        expect(script).toContain("for (const id of ['home-link', 'web-link', 'feature-web-link'])");
        expect(script).not.toContain("VITE_EXTENSION_WEB_APP_URL ?? 'http://localhost:5174'");
        expect(script).not.toContain("'result-web-link'");
    });

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

    it('previews document autofill before applying values to the page', () => {
        expect(script).toContain("requireElement('autofill-apply-button')");
        expect(script).toContain("requireElement('autofill-rescan-button')");
        expect(script).toContain("documentInputModeButton.addEventListener('click', () => {");
        expect(script).toContain('void previewDocumentAutoFill();');
        expect(script).toContain("autofillApplyButton.addEventListener('click'");
        expect(script).toContain('void applyDocumentAutoFill();');
        expect(script).toContain("autofillRescanButton.addEventListener('click'");
        expect(script).toContain('pendingDocumentAutoFillProfile = null;');
        expect(script).toContain("type: 'EZONE_PREVIEW_APPLICATION_AUTOFILL'");
        expect(script).toContain("type: 'EZONE_APPLY_APPLICATION_AUTOFILL'");
        expect(script).not.toContain('void runDocumentAutoFill();');
    });

    it('refreshes document autofill preview when the application page changes while the panel is open', () => {
        expect(script).toContain("const APPLICATION_FORM_CHANGED_MESSAGE = 'EZONE_APPLICATION_FORM_CHANGED'");
        expect(script).toContain('chrome.runtime.onMessage?.addListener(handleRuntimeMessage);');
        expect(script).toContain('function handleRuntimeMessage(message, sender)');
        expect(script).toContain('message?.type !== APPLICATION_FORM_CHANGED_MESSAGE');
        expect(script).toContain('documentResultPanel.hidden');
        expect(script).toContain('refreshDocumentAutoFillPreview');
        expect(script).toContain('pendingDocumentAutoFillProfile ?? await documentProfileApi.getDocumentProfile()');
    });

    it('explains address fields that require the site address-search flow', () => {
        expect(script).toContain('...getAutofillFailureDisplay(item)');
        expect(script).toContain('function getAutofillFailureDisplay');
        expect(script).toContain("fieldKey.includes('address')");
        expect(script).toContain("variant: 'action-needed'");
        expect(script).toContain('\\uC8FC\\uC18C \\uAC80\\uC0C9 \\uD6C4 \\uBCF5\\uC0AC \\uD6C4\\uBCF4\\uC5D0\\uC11C');
        expect(script).toContain("item.className = 'is-empty'");
        expect(script).toContain('autofill-result-value');
        expect(script).toContain('autofill-result-note');
        expect(script).not.toContain("valueLabel: '\\uBD99\\uC5EC\\uB123\\uC744 \\uAC12'");
        expect(script).not.toContain('\\uC790\\uB3D9 \\uC785\\uB825\\uC744 \\uBA48\\uCD84\\uC2B5\\uB2C8\\uB2E4');
        expect(script).not.toMatch(/actionAriaLabel: `\$\{item\?\.label \?\? '\\uC8FC\\uC18C'\}/);
    });

    it('explains fields that are recognized but missing from the document profile', () => {
        expect(script).toContain("reason === 'missing_profile_value'");
        expect(script).toContain('\\uC11C\\uB958 \\uC785\\uB825 \\uC815\\uBCF4\\uC5D0 \\uAC12\\uC744 \\uCD94\\uAC00');
    });

    it('explains application-specific fields that the document profile does not model', () => {
        expect(script).toContain("reason === 'unsupported_profile_field'");
        expect(script).toContain('\\uC9C0\\uC6D0\\uC11C\\uC5D0\\uC11C \\uC9C1\\uC811 \\uC785\\uB825');
    });

    it('adds copy buttons to document autofill copy candidates', () => {
        expect(script).toContain("actionLabel: '\\uBCF5\\uC0AC'");
        expect(script).toContain("actionDoneLabel: '\\uBCF5\\uC0AC\\uB428'");
        expect(script).toContain('actionValue: item.value');
        expect(script).toContain('autofill-result-copy-button');
        expect(script).toContain('async function copyTextToClipboard');
        expect(script).toContain('navigator.clipboard.writeText(text)');
        expect(script).toContain('function copyTextWithFallback');
    });

    it('removes planned or filled items from copy candidates while keeping manual review values copyable', () => {
        expect(script).toContain('primaryFieldKeys');
        expect(script).toContain('visibleCopyCandidates');
        expect(script).toContain('!primaryFieldKeys.has(item?.key)');
        expect(script).toContain('autofillCopyCount.textContent = String(visibleCopyCandidates.length)');
        expect(script).toContain('renderResultList(autofillCopyList, visibleCopyCandidates.slice(0, 12)');
    });

    it('explains tailored activity fields as copy-assisted manual input', () => {
        expect(script).toContain("reason === 'tailored_activity_required'");
        expect(script).toContain('직무 맞춤 필요');
        expect(script).toContain('아래 복사 후보에서 활동을 골라 지원 직무에 맞게 붙여넣어 주세요.');
    });

    it('highlights section-opening steps separately from normal autofill values', () => {
        expect(script).toContain('function getPrimaryAutoFillDisplay');
        expect(script).toContain('function isSectionOpenItem');
        expect(script).toContain('item?.sectionOpenControl');
        expect(script).toContain("variant: 'section-open'");
        expect(script).toContain('\\uBA3C\\uC800 \\uC2E4\\uD589');
        expect(script).toContain('\\uC5F4\\uAE30 \\uC644\\uB8CC');
        expect(script).toContain('endsWith(\'.open\')');
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
        expect(script).toContain('async function handleAuthExpired(error, continuation = null)');
        expect(script).toContain('await clearExtensionSession();');
        expect(script).toContain('await rememberPendingLoginContinuation(continuation);');
        expect(script).toContain('showPanel(loginPanel);');
    });

    it('automatically resumes the selected extension task after web login stores the session', () => {
        expect(script).toContain('let waitingForWebLogin = false;');
        expect(script).toContain('let pendingLoginContinuation = null;');
        expect(script).toContain('PENDING_EXTENSION_CONTINUATION_KEY');
        expect(script).toContain('const LOGIN_CONTINUATIONS = new Set');
        expect(script).toContain('const LOGIN_SESSION_POLL_INTERVAL_MS');
        expect(script).toContain('chrome.storage.onChanged?.addListener(handleSessionStorageChanged);');
        expect(script).toContain('startLoginSessionPolling();');
        expect(script).toContain('await rememberPendingLoginContinuation(pendingLoginContinuation ?? inferVisibleLoginContinuation())');
        expect(script).toContain('async function reconcileWebLoginSession');
        expect(script).toContain('async function handleSessionStorageChanged(changes, areaName)');
        expect(script).toContain('waitingForWebLogin = false;');
        expect(script).toContain('async function resumeAfterWebLogin');
        expect(script).toContain('await resumePendingExtensionAction();');
        expect(script).toContain('async function resumePendingExtensionAction');
        expect(script).toContain('pendingLoginContinuation ?? await readPendingLoginContinuation()');
        expect(script).toContain('await rememberPendingLoginContinuation(null);');
        expect(script).toContain('async function rememberPendingLoginContinuation');
        expect(script).toContain('async function readPendingLoginContinuation');
        expect(script).toContain('function normalizeLoginContinuation');
        expect(script).toContain("continuation === 'documentAutoFill'");
        expect(script).toContain('await previewDocumentAutoFill();');
        expect(script).toContain("continuation === 'jobPreview'");
        expect(script).toContain('await loadPreview({ force: true, showUnsupportedMessage: true });');
        expect(script).toContain('showFeatureSelection();');
        expect(script).toContain("handleAuthExpired(error, 'documentAutoFill')");
        expect(script).toContain("handleAuthExpired(error, 'jobPreview')");
        expect(script).not.toContain('pendingLoginContinuation = continuation;');
        expect(script).not.toContain('await loadPreview({ force: true, fallbackPanel: featurePanel });');
        expect(script).not.toContain('로그인 완료 후 팝업을 다시 열어 주세요.');
    });

    it('shows feature selection only after a stored or newly completed login session', () => {
        expect(script).toContain('function showFeatureSelection');
        expect(script).toContain('showPanel(featurePanel);');
        expect(script).toContain('!featurePanel.hidden');
        expect(script).not.toContain('await loadPreview({ fallbackPanel: featurePanel });');
    });

    it('reports embedded popup height so the in-page panel can fit its current content', () => {
        expect(script).toContain("const PANEL_RESIZE_MESSAGE = 'EZONE_PANEL_RESIZE'");
        expect(script).toContain('setupPanelAutoResize();');
        expect(script).toContain('function setupPanelAutoResize');
        expect(script).toContain('new ResizeObserver');
        expect(script).toContain('function schedulePanelResize');
        expect(script).toContain('function reportPanelHeight');
        expect(script).toContain('window.parent.postMessage');
        expect(script).toContain('const PANEL_RESIZE_EPSILON_PX = 2');
        expect(script).toContain('let lastReportedPanelHeight = 0');
        expect(script).toContain("document.querySelector('.popup-header')");
        expect(script).toContain('].filter(Boolean).forEach((item) => observer.observe(item));');
        expect(script).toContain('const panelHeight = measureIntrinsicPanelHeight(activePanel)');
        expect(script).toContain('function measureIntrinsicPanelHeight');
        expect(script).toContain('child.getBoundingClientRect()');
        expect(script).toContain('Math.abs(height - lastReportedPanelHeight) < PANEL_RESIZE_EPSILON_PX');
        expect(script).toContain('height');
        expect(script).not.toContain('document.body,');
        expect(script).not.toContain('const panelHeight = activePanel.scrollHeight');
        expect(script).not.toContain('Math.max(activePanel.scrollHeight, activePanel.getBoundingClientRect().height)');
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
        expect(script).toContain("data-max-length-unit");
        expect(script).toContain('formatEssayQuestionLimit');
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
