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
        expect(script).toContain("ensureContentScriptLoaded(tab.id, 'assets/applicationAutoFill.js'");
        expect(script).toContain('window.ezOneAutoFillApplicationLoaded');
    });

    it('shows a job-page notice before extraction on unsupported pages', () => {
        expect(script).toContain('function isSupportedJobPostingPage');
        expect(script).toContain("parsedUrl.hostname.endsWith('jasoseol.com')");
        expect(script).toContain("parsedUrl.pathname.startsWith('/recruit')");
        expect(script).toContain("parsedUrl.searchParams.has('campaignid')");
        expect(script).toContain("setStatus('지원하려는 자소설닷컴 공고에 들어간 뒤 다시 실행해 주세요.', true)");
    });

    it('returns to the login panel when the extension session expires', () => {
        expect(script).toContain('AUTH_EXPIRED_MESSAGE');
        expect(script).toContain('async function handleAuthExpired(error)');
        expect(script).toContain('await clearExtensionSession();');
        expect(script).toContain('showPanel(loginPanel);');
    });
    it('includes manually entered essay questions in the save payload', () => {
        expect(script).toContain("requireElement('essay-questions-input')");
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
        expect(script).toContain('roleEssayQuestions: buildRoleEssayQuestionsPayload(selectedRoles)');
    });
});
