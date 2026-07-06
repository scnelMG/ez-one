import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('extension popup script', () => {
    const script = readFileSync(resolve(__dirname, '../src/popup/popup.js'), 'utf-8');

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
        document.body.innerHTML = '';
        delete window.__renderAutoFillResult;
        delete globalThis.chrome;
        delete globalThis.ResizeObserver;
    });

    function createPopupFixture() {
        const listIds = new Set([
            'essay-question-list',
            'role-options',
            'saved-job-list',
            'autofill-filled-list',
            'autofill-failed-list',
            'autofill-copy-list',
            'activity-assist-list'
        ]);
        const buttonIds = new Set([
            'login-button',
            'job-save-mode-button',
            'document-input-mode-button',
            'save-button',
            'reload-preview-button',
            'autofill-apply-button',
            'autofill-rescan-button',
            'activity-assist-button'
        ]);
        const inputIds = new Set([
            'company-name-input',
            'position-title-input',
            'deadline-label-input',
            'activity-assist-count-input',
            'activity-assist-limit-input'
        ]);
        const linkIds = new Set(['basket-link', 'home-link', 'web-link', 'feature-web-link']);
        const ids = [
            'status-panel',
            'login-panel',
            'feature-panel',
            'preview-panel',
            'result-panel',
            'document-result-panel',
            'status-title',
            'status-message',
            ...buttonIds,
            ...inputIds,
            'essay-fieldset',
            ...listIds,
            'essay-question-status',
            'role-count',
            ...linkIds,
            'result-message',
            'document-result-title',
            'autofill-summary',
            'autofill-filled-count',
            'autofill-filled-label',
            'autofill-review-count',
            'autofill-copy-count',
            'autofill-filled-heading',
            'autofill-filled-caption',
            'activity-assist-section',
            'activity-assist-caption',
            'activity-assist-unit-select',
            'activity-assist-status'
        ];

        const root = document.createElement('main');
        for (const id of ids) {
            let element;
            if (listIds.has(id)) element = document.createElement('ul');
            else if (buttonIds.has(id)) element = document.createElement('button');
            else if (inputIds.has(id)) element = document.createElement('input');
            else if (linkIds.has(id)) element = document.createElement('a');
            else if (id === 'activity-assist-unit-select') element = document.createElement('select');
            else element = document.createElement('div');
            element.id = id;
            root.appendChild(element);
        }
        document.body.appendChild(root);
    }

    function loadPopupRuntime() {
        createPopupFixture();
        globalThis.ResizeObserver = class {
            observe() {}
            disconnect() {}
        };
        globalThis.chrome = {
            storage: {
                local: {
                    get: vi.fn(async () => ({})),
                    set: vi.fn(async () => {}),
                    remove: vi.fn(async () => {})
                },
                onChanged: { addListener: vi.fn() }
            },
            tabs: {
                query: vi.fn(async () => []),
                create: vi.fn(async () => ({})),
                sendMessage: vi.fn(async () => ({}))
            },
            scripting: {
                executeScript: vi.fn(async () => [])
            },
            runtime: {
                onMessage: { addListener: vi.fn() },
                sendMessage: vi.fn(async () => ({}))
            }
        };
        const runnableScript = `
const __env = {};
function createExtensionJobApi() { return { save: async () => [] }; }
function createExtensionDocumentProfileApi() { return { getLatest: async () => null, createActivityRecommendations: async () => [] }; }
const ACCESS_TOKEN_KEY = 'accessToken';
const PENDING_EXTENSION_CONTINUATION_KEY = 'pendingExtensionContinuation';
const REFRESH_TOKEN_KEY = 'refreshToken';
function buildWebLoginUrl() { return new URL('https://example.test/login'); }
async function clearStoredSession() {}
async function saveStoredSession() {}
async function validateStoredSession() { return null; }
${script
        .replace(/import \{ createExtensionJobApi \} from '\.\.\/shared\/api\/extensionJobApi';\r?\n/, '')
        .replace(/import \{ createExtensionDocumentProfileApi \} from '\.\.\/shared\/api\/extensionDocumentProfileApi';\r?\n/, '')
        .replace(/import \{[\s\S]*?\} from '\.\.\/shared\/auth\/extensionAuth';\r?\n/, '')
        .replace(/import '\.\/popup\.css';\r?\n/, '')
        .replace(/import\.meta\.env\./g, '__env.')
        .replace('void init();', '')
        .replace('startPostingChangeWatcher();', '')}
window.__renderAutoFillResult = renderAutoFillResult;
`;
        (0, eval)(runnableScript);
        return window.__renderAutoFillResult;
    }

    it('requires configured extension origins instead of hardcoded local runtime fallbacks', () => {
        expect(script).toContain('function resolveExtensionApiBaseUrl');
        expect(script).toContain('function parseHttpOrigin');
        expect(script).toContain("const apiFallbackBaseUrls = import.meta.env.VITE_EXTENSION_API_FALLBACK_BASE_URLS ?? ''");
        expect(script).toContain("for (const id of ['home-link', 'web-link', 'feature-web-link'])");
        expect(script).not.toContain("VITE_EXTENSION_WEB_APP_URL ?? 'http://localhost:5173'");
        expect(script).not.toContain("VITE_EXTENSION_WEB_APP_URL ?? 'http://localhost:5174'");
        expect(script).not.toContain("'http://localhost:8080/api'");
        expect(script).not.toContain("'http://127.0.0.1:8080/api'");
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

    it('retries transient tab/frame failures while loading and messaging autofill content scripts', () => {
        expect(script).toContain('async function withTransientTabRetry');
        expect(script).toContain('function isTransientTabError');
        expect(script).toContain('function sendContentScriptMessage');
        expect(script).toContain('Frame with ID 0 was removed');
        expect(script).toContain('Receiving end does not exist');
        expect(script).toContain('await sleep(120)');
        expect(script).toContain('withTransientTabRetry(() => loadContentScript');
        expect(script).toContain('sendContentScriptMessage(tab.id, {');
        expect(script).toContain('type: \'EZONE_PREVIEW_APPLICATION_AUTOFILL\'');
        expect(script).toContain('type: \'EZONE_APPLY_APPLICATION_AUTOFILL\'');
        expect(script).not.toContain('chrome.tabs.sendMessage(tab.id, {');
    });

    it('previews document autofill before applying values to the page', () => {
        expect(script).toContain("requireElement('autofill-apply-button')");
        expect(script).toContain("requireElement('autofill-rescan-button')");
        expect(script).toContain("documentInputModeButton.addEventListener('click', () => {");
        expect(script).toContain("void runAuthenticatedAction('documentAutoFill', () => previewDocumentAutoFill());");
        expect(script).toContain("autofillApplyButton.addEventListener('click'");
        expect(script).toContain("void runAuthenticatedAction('documentAutoFill', () => applyDocumentAutoFill());");
        expect(script).toContain("autofillRescanButton.addEventListener('click'");
        expect(script).toContain('pendingDocumentAutoFillProfile = null;');
        expect(script).toContain("type: 'EZONE_PREVIEW_APPLICATION_AUTOFILL'");
        expect(script).toContain("type: 'EZONE_APPLY_APPLICATION_AUTOFILL'");
        expect(script).not.toContain('void runDocumentAutoFill();');
    });

    it('does not refresh document autofill preview automatically when the application page changes', () => {
        expect(script).not.toContain("const APPLICATION_FORM_CHANGED_MESSAGE = 'EZONE_APPLICATION_FORM_CHANGED'");
        expect(script).not.toContain('chrome.runtime.onMessage?.addListener(handleRuntimeMessage);');
        expect(script).not.toContain('function handleRuntimeMessage(message, sender)');
        expect(script).not.toContain('scheduleDocumentAutoFillRefresh');
        expect(script).not.toContain('refreshDocumentAutoFillPreview');
        expect(script).toContain("autofillRescanButton.addEventListener('click'");
        expect(script).toContain("void runAuthenticatedAction('documentAutoFill'");
    });

    it('explains address fields that require the site address-search flow', () => {
        expect(script).toContain('...getAutofillFailureDisplay(item)');
        expect(script).toContain('function getAutofillFailureDisplay');
        expect(script).toContain("fieldKey.includes('address')");
        expect(script).not.toContain("badge: '\\uC8FC\\uC18C \\uAC80\\uC0C9 \\uD544\\uC694'");
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

    it('explains certificate autocomplete failures without blaming the profile value', () => {
        expect(script).toContain("reason === 'select_option_not_found'");
        expect(script).toContain('^certificates\\.certificates\\.\\d+\\.certificateName$');
        expect(script).toContain('자격증 검색 결과에서 같은 자격증명을 선택하지 못했습니다.');
        expect(script).not.toContain('선택 가능한 옵션과 내 서류 정보가 맞지 않습니다.');
    });

    it('separates fields that cannot be filled because the service profile has no value', () => {
        expect(script).toContain("variant: 'profile-missing'");
        expect(script).toContain("\\uC11C\\uBE44\\uC2A4\\uC5D0 \\uC5C6\\uB294 \\uC815\\uBCF4");
        expect(script).toContain('\\uB0B4 \\uC11C\\uBE44\\uC2A4\\uC5D0\\uC11C \\uC785\\uB825\\uD558\\uC9C0 \\uC54A\\uC740 \\uC815\\uBCF4');
    });

    it('explains application-specific fields that the document profile does not model', () => {
        expect(script).toContain("reason === 'unsupported_profile_field'");
        expect(script).toContain('\\uC9C0\\uC6D0\\uC11C\\uC5D0\\uC11C \\uC9C1\\uC811 \\uC785\\uB825');
    });

    it('explains required application fields as manual review items', () => {
        expect(script).toContain("reason === 'required_field'");
        expect(script).toContain('지원서의 필수 입력 항목입니다. 직접 입력하거나 확인해 주세요.');
    });

    it('explains optional free-text and addable sections as manual review items', () => {
        expect(script).toContain("reason === 'manual_free_text'");
        expect(script).toContain("reason === 'manual_add_section'");
        expect(script).toContain('기업/직무에 맞춰 직접 작성해 주세요.');
        expect(script).toContain('필요하면 화면에서 추가해 주세요.');
    });

    it('adds copy buttons to document autofill copy candidates', () => {
        expect(script).toContain("actionLabel: '\\uBCF5\\uC0AC'");
        expect(script).toContain("actionDoneLabel: '\\uBCF5\\uC0AC\\uB428'");
        expect(script).toContain('actionValue: item.value');
        expect(script).toContain('autofill-result-copy-button');
        expect(script).toContain('async function copyTextToClipboard');
        expect(script).toContain('window.parent !== window && copyTextWithFallback(text)');
        expect(script).toContain('navigator.clipboard.writeText(text)');
        expect(script).toContain('function copyTextWithFallback');
    });

    it('removes planned or filled items from copy candidates while keeping manual review values copyable', () => {
        expect(script).toContain('primaryCoverage');
        expect(script).toContain('createPrimaryAutoFillCoverage(primaryItems)');
        expect(script).toContain('visibleFailed');
        expect(script).toContain('visibleCopyCandidates');
        expect(script).toContain('groupActivityCopyCandidates');
        expect(script).toContain('buildManualReviewItems(visibleFailed)');
        expect(script).not.toContain('buildManualReviewItems(visibleFailed, groupedCopyCandidates)');
        expect(script).not.toContain("reason: 'manual_copy_candidate'");
        expect(script).not.toContain('formatManualCopyReviewDisplay(item)');
        expect(script).toContain('확인 필요 항목이 없습니다.');
        expect(script).toContain('shouldShowCopyCandidate');
        expect(script).toContain('isCoveredByPrimaryAutoFillItem');
        expect(script).toContain('autoFillCoverageSignature');
        expect(script).toContain("item?.key === 'basicInfo.address' || item?.key === 'basicInfo.addressDetail'");
        expect(script).toContain('autofillCopyCount.textContent = String(groupedCopyCandidates.length)');
        expect(script).toContain('renderResultList(autofillCopyList, groupedCopyCandidates, formatCopyCandidateDisplay');
        expect(script).not.toContain('groupedCopyCandidates.slice(0, 12)');
        expect(script).toContain('formatActivityCopyCandidate');
    });

    it('uses clear document autofill status and action labels', () => {
        expect(script).toContain('복사 필요');
        expect(script).toContain('자동 입력 시작');
        expect(script).not.toContain('확인 후 자동 입력');
        expect(script).not.toContain('복사 후보');
    });

    it('renders partial success with a timed out slow field as automatic input with Korean review-needed output', () => {
        const renderAutoFillResult = loadPopupRuntime();

        renderAutoFillResult({
            metadata: {
                elapsedMs: 1800,
                fastFilledCount: 1,
                slowAttemptedCount: 1,
                timedOutCount: 1
            },
            filled: [{
                fieldKey: 'basicInfo.nameKo',
                label: '\uC774\uB984',
                value: '\uD64D\uAE38\uB3D9',
                displayOrder: 1
            }],
            failed: [{
                label: '\uD559\uAD50\uBA85',
                reason: 'autofill_timeout',
                displayOrder: 2
            }],
            copyCandidates: []
        });

        expect(document.getElementById('document-result-title').textContent).toBe('\uC785\uB825 \uC644\uB8CC, \uD655\uC778 \uD544\uC694');
        expect(document.getElementById('autofill-summary').textContent).toContain('\uC790\uB3D9 \uC785\uB825\uC740 \uC644\uB8CC\uB410\uACE0 \uD655\uC778\uC774 \uD544\uC694\uD55C \uD56D\uBAA9\uC774 \uC788\uC2B5\uB2C8\uB2E4.');
        expect(document.getElementById('autofill-summary').textContent).toContain('\uC785\uB825 1\uAC1C');
        expect(document.getElementById('autofill-summary').textContent).toContain('\uD655\uC778 \uD544\uC694 1\uAC1C');
        expect(document.getElementById('autofill-filled-count').textContent).toBe('1');
        expect(document.getElementById('autofill-review-count').textContent).toBe('1');
        expect(document.getElementById('autofill-filled-heading').textContent).toBe('\uC790\uB3D9 \uC785\uB825');
        expect(document.getElementById('autofill-failed-list').textContent).toContain('\uD559\uAD50\uBA85');
        expect(document.getElementById('autofill-failed-list').textContent).toContain('\uC790\uB3D9 \uC785\uB825 \uC2DC\uAC04\uC774 \uCD08\uACFC');
        expect(document.getElementById('autofill-summary').textContent).not.toContain('1800');
        expect(document.getElementById('autofill-summary').textContent).not.toContain('fastFilledCount');
    });

    it('renders all-failed autofill results as 확인 필요 manual guidance without a fake success count', () => {
        const renderAutoFillResult = loadPopupRuntime();

        renderAutoFillResult({
            filled: [],
            failed: [{
                label: '\uD559\uAD50\uBA85',
                reason: 'control_not_ready',
                displayOrder: 1
            }],
            copyCandidates: []
        });

        expect(document.getElementById('document-result-title').textContent).toBe('\uD655\uC778 \uD544\uC694');
        expect(document.getElementById('autofill-summary').textContent).toContain('\uC790\uB3D9 \uC785\uB825\uB41C \uD56D\uBAA9\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.');
        expect(document.getElementById('autofill-summary').textContent).toContain('\uD655\uC778 \uD544\uC694 1\uAC1C');
        expect(document.getElementById('autofill-summary').textContent).not.toContain('1\uAC1C \uD56D\uBAA9\uC744 \uC785\uB825');
        expect(document.getElementById('autofill-filled-count').textContent).toBe('0');
        expect(document.getElementById('autofill-review-count').textContent).toBe('1');
        expect(document.getElementById('autofill-filled-list').textContent).toContain('\uC790\uB3D9 \uC785\uB825\uB41C \uD56D\uBAA9\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.');
        expect(document.getElementById('autofill-failed-list').textContent).toContain('\uD559\uAD50\uBA85');
    });

    it('keeps copy-needed items out of the manual review list', () => {
        expect(script).toContain('function buildManualReviewItems(failed)');
        expect(script).toContain('const seenKeys = new Set()');
        expect(script).not.toContain('hasAddressSearchReview');
        expect(script).not.toContain("key === 'basicInfo.addressDetail' && hasAddressSearchReview");
    });

    it('sorts autofill result sections by the source page display order', () => {
        expect(script).toContain('sortByDisplayOrder');
        expect(script).toContain('displayOrder');
        expect(script).toContain('const primaryItems = sortByDisplayOrder');
        expect(script).toContain('const visibleFailed = sortByDisplayOrder');
        expect(script).toContain('const groupedCopyCandidates = sortByDisplayOrder');
        expect(script).toContain('const manualReviewItems = sortByDisplayOrder');
    });

    it('groups education autofill items into compact profile-based summary cards', () => {
        expect(script).toContain('renderPrimaryAutoFillList(autofillFilledList, primaryItems, isPreview)');
        expect(script).toContain('function renderPrimaryAutoFillList');
        expect(script).toContain('function groupPrimaryAutoFillItems');
        expect(script).toContain('function createEducationAutoFillGroups');
        expect(script).toContain('function createAutoFillGroupCard');
        expect(script).toContain('autofill-group-card');
        expect(script).toContain('autofill-group-summary');
        expect(script).toContain('autofill-group-details');
        expect(script).toContain("'\\uACE0\\uB4F1\\uD559\\uAD50'");
        expect(script).toContain("'\\uB300\\uD559\\uAD50'");
        expect(script).toContain("'\\uC804\\uACF5'");
        expect(script).toContain("'\\uC131\\uC801'");
        expect(script).toContain('education.highSchool.schoolName');
        expect(script).toContain('^education\\.universities\\.\\d+\\.majors');
        expect(script).toContain('function isEducationGradeField');
    });

    it('groups certificate autofill items into compact certificate summary cards', () => {
        expect(script).toContain('function createCertificateAutoFillGroups');
        expect(script).toContain('^certificates\\.certificates\\.(\\d+)\\.(.+)$');
        expect(script).toContain("'\\uC790\\uACA9\\uC99D'");
        expect(script).toContain('certificateName');
        expect(script).toContain('issuingOrganization');
        expect(script).toContain('registrationNumber');
        expect(script).toContain('acquisitionDate');
    });

    it('groups basic info autofill items into one compact basic info summary card', () => {
        expect(script).toContain('function createBasicInfoAutoFillGroups');
        expect(script).toContain("type: 'basic-info-group'");
        expect(script).toContain("'\\uAE30\\uBCF8 \\uC815\\uBCF4'");
        expect(script).toContain('basicInfo.nameKo');
        expect(script).toContain('basicInfo.birthdate');
        expect(script).toContain('basicInfo.gender');
        expect(script).toContain('basicInfo.email');
        expect(script).toContain('basicInfo.phone');
        expect(script).toContain('createBasicInfoSummary');
    });

    it('groups military autofill items into one compact military summary card', () => {
        expect(script).toContain('function createMilitaryAutoFillGroups');
        expect(script).toContain("type: 'military-group'");
        expect(script).toContain("'\\uBCD1\\uC5ED'");
        expect(script).toContain('military.status');
        expect(script).toContain('military.branch');
        expect(script).toContain('military.enlistmentDate');
        expect(script).toContain('military.dischargeDate');
        expect(script).toContain('military.rank');
        expect(script).toContain('military.dischargeType');
        expect(script).toContain('createMilitarySummary');
    });

    it('groups career autofill items into compact career summary cards', () => {
        expect(script).toContain('function createCareerAutoFillGroups');
        expect(script).toContain("type: 'career-group'");
        expect(script).toContain("'\\uACBD\\uB825'");
        expect(script).toContain('^career\\.careers\\.(\\d+)\\.(.+)$');
        expect(script).toContain('companyName');
        expect(script).toContain('employmentType');
        expect(script).toContain('roleName');
        expect(script).toContain('createCareerSummaryLine');
    });

    it('groups language test autofill items into compact language summary cards', () => {
        expect(script).toContain('function createLanguageTestAutoFillGroups');
        expect(script).toContain("type: 'language-test-group'");
        expect(script).toContain("'\\uC5B4\\uD559'");
        expect(script).toContain('^certificates\\.languageTests\\.(\\d+)\\.(.+)$');
        expect(script).toContain('testName');
        expect(script).toContain('score');
        expect(script).toContain('createLanguageTestSummaryLine');
    });

    it('groups activity copy candidates by activity instead of showing every field as a flat row', () => {
        expect(script).toContain('function groupActivityCopyCandidates');
        expect(script).toContain('/^activities\\.(\\d+)\\.(.+)$/');
        expect(script).toContain('activityGroupOrder');
        expect(script).toContain('function formatActivityCopyCandidate');
        expect(script).toContain('activityType');
        expect(script).toContain('description');
    });

    it('explains tailored activity fields as copy-assisted manual input', () => {
        expect(script).toContain("reason === 'tailored_activity_required'");
        expect(script).toContain('\uC9C1\uBB34 \uB9DE\uCDA4 \uD544\uC694');
        expect(script).toContain('\uD65C\uB3D9\uC740 \uC9C0\uC6D0 \uC9C1\uBB34\uC5D0 \uB9DE\uAC8C \uC120\uD0DD\uD574 \uBD99\uC5EC\uB123\uC5B4 \uC8FC\uC138\uC694.');
    });

    it('shows job-fit activity recommendations in the document autofill result panel', () => {
        expect(script).toContain("requireElement('activity-assist-section')");
        expect(script).toContain("requireElement('activity-assist-button')");
        expect(script).toContain('ACTIVITY_ASSIST_BUTTON_LABEL');
        expect(script).toContain('AI\uB85C \uD65C\uB3D9 \uCD94\uCC9C \uB9CC\uB4E4\uAE30');
        expect(script).toContain('AI\uAC00 \uC790\uB3D9\uC73C\uB85C \uD65C\uB3D9\uC744 \uC9C1\uBB34 \uC801\uD569\uB3C4 \uC21C\uC11C\uB85C \uC815\uB82C\uD558\uACE0 \uC788\uC2B5\uB2C8\uB2E4.');
        expect(script).toContain('AI\uAC00 \uD65C\uB3D9\uC744 \uC9C1\uBB34 \uC801\uD569\uB3C4 \uC21C\uC11C\uB85C \uC815\uB82C\uD558\uACE0 \uC788\uC2B5\uB2C8\uB2E4.');
        expect(script).toContain('function scheduleAutomaticActivityAssistRequest');
        expect(script).toContain('activityAssistAutoRequestKey');
        expect(script).toContain('requestActivityAssist({ automatic: true })');
        expect(script).toContain('AI \uCD94\uCC9C\uB3C4');
        expect(script).toContain('\uAE00\uC790\uC218 \uB9DE\uCDA4');
        expect(script).toContain('documentProfileApi.recommendActivities');
        expect(script).toContain('function shouldShowActivityAssist');
        expect(script).toContain('function renderActivityAssistResult');
        expect(script).toContain('function formatActivityAssistCounter');
    });

    it('does not ship mojibake in user-facing popup script strings', () => {
        expect(script).not.toMatch(/[\u8A5B\u6028\u5A9B\u00C3\uFFFD\uF9DE\u7570\u8E30\u63F6]/);
        expect(script).not.toContain(['?'.repeat(2), '?'.repeat(2), '?'.repeat(2)].join(' '));
    });

    it('hides internal section-opening steps from user-facing autofill results', () => {
        expect(script).toContain('function getPrimaryAutoFillDisplay');
        expect(script).toContain('function isUserVisibleAutoFillItem');
        expect(script).toContain('function isSectionOpenItem');
        expect(script).toContain('item?.sectionOpenControl');
        expect(script).toContain('.filter(isUserVisibleAutoFillItem)');
        expect(script).toContain('return !isSectionOpenItem(item);');
        expect(script).not.toContain("variant: 'section-open'");
        expect(script).not.toContain('1\\uB2E8\\uACC4');
        expect(script).not.toContain('\\uC790\\uB3D9 \\uC785\\uB825 \\uBC84\\uD2BC \\uD55C \\uBC88\\uC73C\\uB85C \\uCC98\\uB9AC\\uB429\\uB2C8\\uB2E4.');
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

    it('EXT-003: validates stored extension sessions before showing feature selection', () => {
        expect(script).toContain('validateStoredSession');
        expect(script).toContain('const session = await validateStoredSession(chrome.storage.local');
        expect(script).toContain('requireFreshSession: true');
        expect(script).not.toContain('const session = await getStoredSession(chrome.storage.local);');
        expect(script).toContain('hasExtensionSession = false;');
        expect(script).toContain('showPanel(loginPanel);');
        expect(script).not.toContain('hasExtensionSession = true;\\n    await resumePendingExtensionAction();');
    });

    it('EXT-003: revalidates the extension session before running feature actions', () => {
        expect(script).toContain("void runAuthenticatedAction('jobPreview'");
        expect(script).toContain("void runAuthenticatedAction('documentAutoFill'");
        expect(script).toContain('async function runAuthenticatedAction(continuation, action)');
        expect(script).toContain('async function ensureAuthenticatedExtensionSession(continuation = null)');
        expect(script).toContain('const session = await readValidatedExtensionSession();');
        expect(script).toContain('await clearExtensionSession();');
        expect(script).toContain('await rememberPendingLoginContinuation(continuation);');
        expect(script).toContain('showPanel(loginPanel);');
    });

    it('EXT-003: preserves the active tab and requested action before starting web login', () => {
        expect(script).toContain('await rememberPendingLoginContinuation(pendingLoginContinuation ?? inferVisibleLoginContinuation())');
        expect(script).toContain('sourceTabId: tab.id');
        expect(script).toContain('currentUrl: tab.url ??');
        expect(script).toContain("const LOGIN_CONTINUATIONS = new Set(['jobPreview', 'documentAutoFill'])");
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
        expect(script).toContain('const measuredPanelHeight = measureIntrinsicPanelHeight(activePanel)');
        expect(script).toContain('activePanel === previewPanel');
        expect(script).toContain('Math.max(measuredPanelHeight, activePanel.scrollHeight)');
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

    it('EXT-017: does not preselect the first role option in the save preview', () => {
        expect(script).toContain("const selectedRoles = Array.from(roleOptions.querySelectorAll('input:checked'))");
        expect(script).toContain('if (selectedRoles.length === 0)');
        expect(script).not.toContain('input.checked = index === 0');
    });

    it('EXT-017: hides essay questions until a role is selected, then shows the role questions', () => {
        expect(script).toContain("const essayFieldset = requireElement('essay-fieldset');");
        expect(script).toContain('hideEssayQuestions();');
        expect(script).toContain('function hideEssayQuestions()');
        expect(script).toContain('essayFieldset.hidden = true;');
        expect(script).toContain('if (selectedRoles.length === 0) {');
        expect(script).toContain('showEssayQuestions();');
        expect(script).toContain('function showEssayQuestions()');
        expect(script).toContain('essayFieldset.hidden = false;');
        expect(script).not.toContain('const ESSAY_QUESTION_PREVIEW_ENABLED = false;');
    });

    it('keeps manual autofill guidance short and action-oriented', () => {
        expect(script).toContain('기업/직무에 맞춰 직접 작성해 주세요.');
        expect(script).toContain('필요하면 화면에서 추가해 주세요.');
        expect(script).not.toContain('기업/직무에 맞춰 직접 작성하면 좋은 장문 항목입니다.');
        expect(script).not.toContain('필요하면 화면에서 추가하고 내용을 직접 작성해 주세요.');
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
        expect(script).toContain("void runAuthenticatedAction('jobPreview', () => loadPreview({ force: true, showUnsupportedMessage: true }));");
        expect(script).toContain('essayQuestionRequestId += 1;');
        expect(script).toContain('(posting.essayQuestions ?? []).length > 0');
    });
});
