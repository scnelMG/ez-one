import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('extension popup markup', () => {
    const markup = readFileSync(resolve(__dirname, '../popup.html'), 'utf-8');

    it('keeps login before feature selection in the popup flow', () => {
        const loginPanel = markup.match(/<section id="login-panel"[\s\S]*?<\/section>/)?.[0] ?? '';
        const featurePanel = markup.match(/<section id="feature-panel"[\s\S]*?<\/section>/)?.[0] ?? '';

        expect(loginPanel).toContain('로그인이 필요합니다');
        expect(loginPanel).toContain('Google로 로그인');
        expect(loginPanel).not.toContain('계정 연결');
        expect(loginPanel).not.toContain('mode-card');
        expect(featurePanel).toContain('작업을 선택하세요');
        expect(featurePanel).toContain('공고 저장하기');
        expect(featurePanel).toContain('서류 정보 입력하기');
        expect(featurePanel).toContain('id="job-save-mode-button"');
        expect(featurePanel).toContain('id="document-input-mode-button"');
        expect(featurePanel).toContain('id="feature-web-link"');
        expect(featurePanel).toContain('EZ-ONE 웹으로 이동');
        expect(featurePanel).toContain('class="secondary-button feature-web-link"');
        expect(featurePanel).toContain('class="mode-icon"');
        expect(featurePanel).not.toContain('채용공고');
        expect(featurePanel).not.toContain('서류입력');
        expect(featurePanel).not.toContain('작업 선택');
        expect(featurePanel).not.toContain('mode-card active');
        expect(featurePanel).not.toContain('disabled aria-disabled="true"');
    });

    it('uses the logo once without repeating the service name beside it', () => {
        const header = markup.match(/<header class="popup-header"[\s\S]*?<\/header>/)?.[0] ?? '';

        expect(header).toContain('aria-label="EZ-ONE 홈"');
        expect(header).toContain('class="brand-mark"');
        expect(header).not.toContain('지원 도구');
        expect(header).not.toContain('header-status');
        expect(header).not.toMatch(/<strong>\s*EZ-ONE\s*<\/strong>/);
    });

    it('uses readable P1 job-save copy and valid visible closing tags', () => {
        expect(markup).toContain('회사');
        expect(markup).toContain('공고');
        expect(markup).toContain('마감');
        expect(markup).toContain('선택한 공고 장바구니에 담기');
        expect(markup).toContain('id="reload-preview-button"');
        expect(markup).toContain('현재 공고 다시 읽기');
        expect(markup).toContain('장바구니에 담았습니다');
        expect(markup).toContain('선택한 직무가 저장되었습니다.');
        expect(markup).not.toContain('id="save-another-button"');
        expect(markup).not.toContain('현재 열린 공고 읽기');
        expect(markup).not.toContain('다른 공고를 열면 자동으로 다시 읽습니다.');
        expect(markup).not.toContain('저장 전 확인');
        expect(markup).not.toContain('저장 완료');
        expect(markup).not.toContain('회사, 공고명, 마감일과 직무를 확인하세요.');
        expect(markup).not.toMatch(/<span class="section-kicker">/);
        expect(markup).not.toMatch(/[�]/);
        expect(markup).not.toMatch(/[?][가-힣]?/);
        expect(markup).not.toMatch(/>[^<]*\/(?:h1|h2|strong|button)>/);
    });

    it('keeps the saved-job result action focused on opening the basket', () => {
        const resultPanel = markup.match(/<section id="result-panel"[\s\S]*?<\/section>/)?.[0] ?? '';

        expect(resultPanel).toContain('id="basket-link"');
        expect(resultPanel).not.toContain('id="result-web-link"');
        expect(resultPanel).not.toContain('id="feature-web-link"');
        expect(resultPanel).not.toContain('EZ-ONE 웹으로 이동');
    });

    it('EXT-022/EXT-023: renders document autofill result lists', () => {
        expect(markup).toContain('id="document-result-panel"');
        expect(markup).toContain('id="document-result-title"');
        expect(markup).toContain('class="autofill-summary-grid"');
        expect(markup).toContain('id="autofill-filled-count"');
        expect(markup).toContain('id="autofill-filled-label"');
        expect(markup).toContain('id="autofill-review-count"');
        expect(markup).toContain('id="autofill-copy-count"');
        expect(markup).toContain('id="autofill-filled-heading"');
        expect(markup).toContain('id="autofill-filled-caption"');
        expect(markup).toContain('id="autofill-filled-list"');
        expect(markup).toContain('id="autofill-failed-list"');
        expect(markup).toContain('id="autofill-copy-list"');
        expect(markup).toContain('id="autofill-apply-button"');
        expect(markup).toContain('id="autofill-rescan-button"');
        expect(markup).toContain('다시 인식');
        expect(markup).toContain('복사 필요');
        expect(markup).toContain('자동 입력 시작');
        expect(markup).not.toContain('복사 후보');
        expect(markup).not.toContain('확인 후 자동 입력');
        expect(markup).toContain('data-tone="success"');
        expect(markup).toContain('data-tone="warning"');
        expect(markup).toContain('data-tone="neutral"');
        expect(markup).toContain('activity-assist-section');
        expect(markup).toContain('AI 활동 추천');
        expect(markup).toContain('직무 적합도 순으로 정렬하고 글자수에 맞춘 붙여넣기 문장을 만듭니다.');
        expect(markup).toContain('activity-assist-flow');
        expect(markup).toContain('AI로 활동 추천 만들기');
    });

    it('EXT-022/EXT-023: places job-fit activity recommendations before copy-needed rows', () => {
        const activityAssistIndex = markup.indexOf('id="activity-assist-section"');
        const copyListIndex = markup.indexOf('id="autofill-copy-list"');

        expect(activityAssistIndex).toBeGreaterThan(-1);
        expect(copyListIndex).toBeGreaterThan(-1);
        expect(activityAssistIndex).toBeLessThan(copyListIndex);
    });

    it('EXT-005: shows whether essay questions were collected for the selected role', () => {
        expect(markup).toContain('id="essay-question-status"');
        expect(markup).toContain('id="essay-question-list"');
        expect(markup).toContain('문항을 가져오면 아래에서 확인할 수 있습니다.');
        expect(markup).not.toContain('선택 직무 기준');
        expect(markup).not.toContain('id="essay-questions-input"');
    });

    it('makes long role lists understandable before selection', () => {
        expect(markup).toContain('id="role-count"');
        expect(markup).not.toContain('직무를 선택하면 해당 직무의 자소서 문항을 확인합니다.');
        expect(markup).toContain('class="action-stack"');
    });

    it('keeps internal requirement ids out of user-facing popup copy', () => {
        expect(markup).not.toMatch(/>[^<]*(EXT|JOB|PROFILE)-\d+[^<]*</);
    });
});
