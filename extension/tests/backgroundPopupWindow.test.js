import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('extension background in-page panel behavior', () => {
    const backgroundScript = readFileSync(resolve(__dirname, '../src/background.js'), 'utf-8');

    it('toggles an in-page extension panel when the extension action icon is clicked', () => {
        expect(backgroundScript).not.toContain('chrome.sidePanel');
        expect(backgroundScript).not.toContain('setPanelBehavior');
        expect(backgroundScript).not.toContain('chrome.windows.create');
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

    it('responds to the web auth handoff before closing the temporary login tab', () => {
        expect(backgroundScript).toContain('sendResponse({ accepted, returnedToSource });');
        expect(backgroundScript).toContain('returnToExtensionTabAfterAuth(chrome.tabs, chrome.scripting, sender.tab?.id, message?.sourceTabId, message?.sourceUrl);');
        expect(backgroundScript).toContain('async function returnToExtensionTabAfterAuth');
        expect(backgroundScript).toContain('await ensurePanelOpenAfterAuth(scripting');
        expect(backgroundScript).toContain('async function ensurePanelOpenAfterAuth');
        expect(backgroundScript).toContain('await removeExistingPanelHost(scripting, tab.id)');
        expect(backgroundScript).toContain('async function removeExistingPanelHost');
        expect(backgroundScript).toContain("document.getElementById('ezone-extension-panel-host')?.remove()");
        expect(backgroundScript).toContain("files: ['assets/panelHost.js']");
        expect(backgroundScript).toContain('function closeAuthTabAfterResponse');
        expect(backgroundScript).toContain('tabs.update(parsedSourceTabId, { active: true })');
        expect(backgroundScript).toContain('function parsePositiveInteger');
        expect(backgroundScript).toContain('setTimeout(() =>');
        expect(backgroundScript).toContain('tabs.remove(senderTabId)');
        expect(backgroundScript).not.toContain('Leave the auth tab open');
    });

    it('EXT-003: falls back to the source URL when the original source tab cannot be focused', () => {
        expect(backgroundScript).toContain('return await returnToSourceUrlFallback(tabs, senderTabId, sourceUrl);');
        expect(backgroundScript).toContain('async function returnToSourceUrlFallback');
        expect(backgroundScript).toContain('tabs.update(senderTabId, { url: safeSourceUrl, active: true })');
        expect(backgroundScript).toContain('tabs.create({ url: safeSourceUrl, active: true })');
        expect(backgroundScript).toContain('function parseSafeHttpUrl');
    });

    it('does not surface transient frame-removal errors when injecting the panel', () => {
        expect(backgroundScript).toContain('async function injectPanelSafely');
        expect(backgroundScript).toContain('function isTransientScriptingError');
        expect(backgroundScript).toContain('Frame with ID 0 was removed');
        expect(backgroundScript).toContain('The tab was closed');
        expect(backgroundScript).toContain('injectPanelSafely(chrome.scripting, tab)');
        expect(backgroundScript).toContain('injectPanelSafely(scripting, tab)');
        expect(backgroundScript).not.toContain('console.error(error)');
    });
});
