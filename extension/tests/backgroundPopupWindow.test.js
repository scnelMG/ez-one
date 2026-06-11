import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('extension background in-page panel behavior', () => {
    const backgroundScript = readFileSync(resolve(__dirname, '../src/background.js'), 'utf-8');

    it('toggles an in-page extension panel when the extension action icon is clicked', () => {
        expect(backgroundScript).not.toContain('chrome.sidePanel');
        expect(backgroundScript).not.toContain('setPanelBehavior');
        expect(backgroundScript).not.toContain('chrome.windows.create');
        expect(backgroundScript).not.toContain('chrome.windows.update');
        expect(backgroundScript).toContain('chrome.action.onClicked.addListener');
        expect(backgroundScript).toContain("files: ['assets/panelHost.js']");
        expect(backgroundScript).not.toContain('window.ezOneTogglePanel?.()');
        expect(backgroundScript).not.toContain('chrome.tabs.sendMessage');
    });

    it('skips Chrome internal pages that cannot receive injected scripts', () => {
        expect(backgroundScript).toContain('function canInjectPanel(tab)');
        expect(backgroundScript).toContain("url.protocol === 'http:' || url.protocol === 'https:'");
        expect(backgroundScript).toContain('canInjectPanel(tab)');
    });
});
