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
        expect(script).toContain('const PANEL_DEFAULT_HEIGHT = 640');
        expect(script).toContain('const PANEL_MIN_HEIGHT = 420');
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
        expect(script).toContain('left: 0;');
        expect(script).not.toContain('left: -6px;');
        expect(script).toContain("resizeHandle.addEventListener('pointerdown'");
        expect(script).toContain('function startResize');
        expect(script).toContain("panel.classList.add('is-resizing')");
        expect(script).toContain("document.addEventListener('pointermove'");
        expect(script).toContain('function setPanelWidth');
        expect(script).toContain('chrome.storage.local.set');
        expect(script).toContain('chrome.storage.local.get');
    });

    it('lets users resize the in-page panel from the bottom edge and remembers the height', () => {
        expect(script).toContain("const PANEL_HEIGHT_STORAGE_KEY = 'ezonePanelHeight'");
        expect(script).toContain("const heightResizeHandle = document.createElement('div')");
        expect(script).toContain("heightResizeHandle.className = 'height-resize-handle'");
        expect(script).toContain('cursor: ns-resize;');
        expect(script).toContain("heightResizeHandle.setAttribute('aria-orientation', 'horizontal')");
        expect(script).toContain("heightResizeHandle.addEventListener('pointerdown'");
        expect(script).toContain('function startHeightResize');
        expect(script).toContain("document.documentElement.style.cursor = 'ns-resize'");
        expect(script).toContain('const height = moveEvent.clientY - PANEL_TOP;');
        expect(script).toContain('savePanelHeight(panel);');
        expect(script).toContain('.panel.is-resizing {');
        expect(script).toContain('transition: none;');
        expect(script).toContain('async function getStoredPanelHeight');
        expect(script).toContain('[PANEL_HEIGHT_STORAGE_KEY]: height');
    });

    it('keeps the outer panel height stable when embedded popup content changes', () => {
        expect(script).toContain("const PANEL_RESIZE_MESSAGE = 'EZONE_PANEL_RESIZE'");
        expect(script).toContain("window.addEventListener('message', panelMessageHandler)");
        expect(script).toContain('function handlePanelMessage');
        expect(script).toContain('event.source !== frame.contentWindow');
        expect(script).toContain('Popup contents scroll internally');
        expect(script).not.toContain('setPanelHeight(panel, Number(event.data.height));');
        expect(script).toContain('function setPanelHeight');
        expect(script).toContain('Math.max(height, PANEL_MIN_HEIGHT)');
        expect(script).toContain('const currentHeight = Math.round(panel.getBoundingClientRect().height);');
        expect(script).toContain('Math.abs(currentHeight - nextHeight) < 2');
        expect(script).toContain('panel.style.height = `${nextHeight}px`;');
        expect(script).toContain('window.removeEventListener');
    });

    it('does not animate automatic height changes when popup content is clicked', () => {
        expect(script).not.toContain('transition: height 160ms ease;');
        expect(script).toContain('transition: none;');
    });
});
