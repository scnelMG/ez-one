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
        expect(script).toContain('const PANEL_DEFAULT_WIDTH = 360');
        expect(script).toContain('const PANEL_RIGHT = 12');
        expect(script).toContain('right: ${PANEL_RIGHT}px');
        expect(script).toContain('const PANEL_DEFAULT_HEIGHT = 420');
        expect(script).toContain('const PANEL_MIN_HEIGHT = 220');
        expect(script).toContain('height: min(${PANEL_DEFAULT_HEIGHT}px, calc(100vh - ${PANEL_TOP * 2}px))');
        expect(script).toContain('max-height: calc(100vh - ${PANEL_TOP * 2}px)');
        expect(script).toContain('z-index: 2147483647');
    });

    it('adds an in-page close control instead of relying on a browser window close button', () => {
        expect(script).toContain("aria-label', 'EZ-ONE close'");
        expect(script).toContain('removePanel');
    });

    it('lets users resize the in-page panel from the left edge and remembers the width', () => {
        expect(script).toContain("const PANEL_WIDTH_STORAGE_KEY = 'ezonePanelWidth'");
        expect(script).toContain('const PANEL_MIN_WIDTH = 320');
        expect(script).toContain('const PANEL_MAX_WIDTH = 520');
        expect(script).toContain("document.createElement('div')");
        expect(script).toContain("resizeHandle.className = 'resize-handle'");
        expect(script).toContain("resizeHandle.setAttribute('role', 'separator')");
        expect(script).toContain("resizeHandle.addEventListener('pointerdown'");
        expect(script).toContain('function startResize');
        expect(script).toContain("panel.classList.add('is-resizing')");
        expect(script).toContain("document.addEventListener('pointermove'");
        expect(script).toContain('function setPanelWidth');
        expect(script).toContain('chrome.storage.local.set');
        expect(script).toContain('chrome.storage.local.get');
    });

    it('resizes panel height to the embedded popup content while respecting the viewport', () => {
        expect(script).toContain("const PANEL_RESIZE_MESSAGE = 'EZONE_PANEL_RESIZE'");
        expect(script).toContain("window.addEventListener('message', panelMessageHandler)");
        expect(script).toContain('function handlePanelMessage');
        expect(script).toContain('event.source !== frame.contentWindow');
        expect(script).toContain('setPanelHeight(panel, Number(event.data.height))');
        expect(script).toContain('function setPanelHeight');
        expect(script).toContain('window.removeEventListener');
    });
});
