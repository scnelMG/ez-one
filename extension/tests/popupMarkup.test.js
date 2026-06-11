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
        expect(markup).toContain('장바구니에 담았습니다');
        expect(markup).not.toMatch(/[�]/);
        expect(markup).not.toMatch(/[?][가-힣]?/);
        expect(markup).not.toMatch(/>[^<]*\/(?:h1|h2|strong|button)>/);
    });

    it('EXT-022/EXT-023: renders document autofill result lists', () => {
        expect(markup).toContain('id="document-result-panel"');
        expect(markup).toContain('id="autofill-filled-list"');
        expect(markup).toContain('id="autofill-failed-list"');
        expect(markup).toContain('id="autofill-copy-list"');
    });

    it('EXT-005: shows whether essay questions were collected for the selected role', () => {
        expect(markup).toContain('id="essay-question-status"');
        expect(markup).toContain('id="essay-questions-input"');
    });

    it('keeps internal requirement ids out of user-facing popup copy', () => {
        expect(markup).not.toMatch(/>[^<]*(EXT|JOB|PROFILE)-\d+[^<]*</);
    });
});
