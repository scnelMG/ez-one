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
        expect(loginPanel).not.toContain('mode-card');
        expect(featurePanel).toContain('기능을 선택하세요');
        expect(featurePanel).toContain('공고 저장하기');
        expect(featurePanel).toContain('서류 정보 입력하기');
        expect(featurePanel).toContain('id="job-save-mode-button"');
    });
    it('uses the P1 job-save wireframe copy without corrupted Korean text', () => {
        expect(markup).toContain('회사');
        expect(markup).toContain('공고');
        expect(markup).toContain('마감');
        expect(markup).toContain('선택한 공고 장바구니에 담기');
        expect(markup).toContain('장바구니에 담았습니다');
        expect(markup).not.toContain('濡');
        expect(markup).not.toContain('怨');
        expect(markup).not.toContain('�');
    });
});
