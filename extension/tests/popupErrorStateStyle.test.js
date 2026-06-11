import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('extension popup error state styling', () => {
    const css = readFileSync(resolve(__dirname, '../src/popup/popup.css'), 'utf-8');
    const script = readFileSync(resolve(__dirname, '../src/popup/popup.js'), 'utf-8');

    it('keeps long error messages inside the status panel without horizontal overflow', () => {
        expect(css).toContain('overflow-x: hidden');
        expect(css).toContain('.status-panel p');
        expect(css).toContain('overflow-wrap: anywhere');
        expect(css).toContain('max-height: 116px');
        expect(css).toContain('overflow-y: auto');
    });

    it('normalizes raw browser errors before showing them to the user', () => {
        expect(script).toContain('function normalizeStatusMessage');
        expect(script).toContain('/failed to fetch/i');
        expect(script).toContain('서버에 연결하지 못했습니다. EZ-ONE 서버가 켜져 있는지 확인해 주세요.');
        expect(script).toContain('normalized.length > 160');
    });
});
