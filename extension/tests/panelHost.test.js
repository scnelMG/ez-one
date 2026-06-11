import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('extension in-page panel host', () => {
    const script = readFileSync(resolve(__dirname, '../src/content/panelHost.js'), 'utf-8');

    it('injects popup.html as a fixed right-aligned iframe inside the current page', () => {
        expect(script).toContain('(() => {');
        expect(script).toContain('togglePanel();');
        expect(script).toContain('document.createElement');
        expect(script).toContain("'iframe'");
        expect(script).toContain("chrome.runtime.getURL('popup.html?embedded=1')");
        expect(script).toContain('position: fixed');
        expect(script).toContain('const PANEL_WIDTH = 360');
        expect(script).toContain('const PANEL_RIGHT = 12');
        expect(script).toContain('right: ${PANEL_RIGHT}px');
        expect(script).toContain('z-index: 2147483647');
    });

    it('adds an in-page close control instead of relying on a browser window close button', () => {
        expect(script).toContain("aria-label', 'EZ-ONE close'");
        expect(script).toContain('removePanel');
    });
});
