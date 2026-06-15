import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('extension popup error state styling', () => {
    const css = readFileSync(resolve(__dirname, '../src/popup/popup.css'), 'utf-8');
    const script = readFileSync(resolve(__dirname, '../src/popup/popup.js'), 'utf-8');

    it('keeps long error messages inside the status panel without horizontal overflow', () => {
        expect(css).toContain('overflow-x: hidden');
        expect(css).toContain('align-self: start');
        expect(css).toContain('.status-copy strong');
        expect(css).toContain('.status-panel p');
        expect(css).toContain('overflow-wrap: anywhere');
        expect(css).toContain('max-height: 96px');
        expect(css).toContain('overflow-y: auto');
        expect(css).toContain('.status-panel.is-guidance');
        expect(css).toContain('grid-template-columns: minmax(0, 1fr)');
        expect(css).toContain('.status-panel.is-guidance .status-copy::before');
        expect(css).toContain('content: "공고 저장 안내"');
        expect(css).toContain('background: #fff7f7');
        expect(css).toContain('background: #fee2e2');
        expect(css).toContain('color: #991b1b');
        expect(css).toContain('.status-panel.is-guidance .state-dot');
        expect(css).toContain('display: none');
    });

    it('normalizes raw browser errors before showing them to the user', () => {
        expect(script).toContain('function normalizeStatusMessage');
        expect(script).toContain('function getStatusTitle');
        expect(script).toContain("return '공고 상세 화면에서 실행해 주세요';");
        expect(script).toContain('채용공고 목록이나 캘린더에서는 저장할 공고를 정확히 찾을 수 없어요.');
        expect(script).toContain('/failed to fetch/i');
        expect(script).toContain('서버에 연결하지 못했습니다. EZ-ONE 서버가 켜져 있는지 확인해 주세요.');
        expect(script).toContain('normalized.length > 160');
    });
});
