(() => {
    const HOST_ID = 'ezone-extension-panel-host';
    const PANEL_RESIZE_MESSAGE = 'EZONE_PANEL_RESIZE';
    const PANEL_WIDTH_STORAGE_KEY = 'ezonePanelWidth';
    const PANEL_HEIGHT_STORAGE_KEY = 'ezonePanelHeight';
    const PANEL_DEFAULT_WIDTH = 360;
    const PANEL_MIN_WIDTH = 320;
    const PANEL_MAX_WIDTH = 520;
    const PANEL_TOP = 12;
    const PANEL_RIGHT = 12;
    const PANEL_DEFAULT_HEIGHT = 640;
    const PANEL_MIN_HEIGHT = 420;
    let panelMessageHandler = null;

    togglePanel();

    function togglePanel() {
        if (document.getElementById(HOST_ID)) {
            removePanel();
            return;
        }

        openPanel();
    }

    function openPanel() {
        const host = document.createElement('div');
        host.id = HOST_ID;

        const shadow = host.attachShadow({ mode: 'closed' });
        const style = document.createElement('style');
        const canEmbedPopup = canLoadPopupFrameOnCurrentPage();
        const frame = canEmbedPopup ? document.createElement('iframe') : null;
        const closeButton = document.createElement('button');
        const resizeHandle = document.createElement('div');
        const heightResizeHandle = document.createElement('div');

        style.textContent = `
            :host {
                all: initial;
                position: fixed;
                top: ${PANEL_TOP}px;
                right: ${PANEL_RIGHT}px;
                z-index: 2147483647;
            }

            .panel {
                position: fixed;
                top: ${PANEL_TOP}px;
                right: ${PANEL_RIGHT}px;
                width: min(${PANEL_DEFAULT_WIDTH}px, calc(100vw - 24px));
                height: min(${PANEL_DEFAULT_HEIGHT}px, calc(100vh - ${PANEL_TOP * 2}px));
                min-height: min(${PANEL_MIN_HEIGHT}px, calc(100vh - ${PANEL_TOP * 2}px));
                max-height: calc(100vh - ${PANEL_TOP * 2}px);
                overflow: hidden;
                border: 1px solid rgba(17, 24, 39, 0.14);
                border-radius: 14px;
                background: #f7f8fb;
                box-shadow: 0 18px 46px rgba(17, 24, 39, 0.28);
                transition: none;
            }

            .panel.is-resizing iframe {
                pointer-events: none;
            }

            .panel.is-resizing {
                transition: none;
            }

            .resize-handle {
                position: absolute;
                top: 14px;
                bottom: 14px;
                left: 0;
                width: 10px;
                cursor: ew-resize;
                z-index: 2147483647;
            }

            .resize-handle::after {
                content: "";
                position: absolute;
                top: 50%;
                left: 3px;
                width: 3px;
                height: 44px;
                border-radius: 999px;
                background: rgba(91, 69, 240, 0.18);
                transform: translateY(-50%);
                transition: background 120ms ease, height 120ms ease;
            }

            .resize-handle:hover::after,
            .panel.is-resizing .resize-handle::after {
                height: 58px;
                background: rgba(91, 69, 240, 0.42);
            }

            .height-resize-handle {
                position: absolute;
                right: 18px;
                bottom: 0;
                left: 18px;
                height: 12px;
                cursor: ns-resize;
                z-index: 2147483647;
            }

            .height-resize-handle::after {
                content: "";
                position: absolute;
                bottom: 4px;
                left: 50%;
                width: 54px;
                height: 3px;
                border-radius: 999px;
                background: rgba(91, 69, 240, 0.18);
                transform: translateX(-50%);
                transition: background 120ms ease, width 120ms ease;
            }

            .height-resize-handle:hover::after,
            .panel.is-resizing .height-resize-handle::after {
                width: 72px;
                background: rgba(91, 69, 240, 0.42);
            }

            iframe {
                display: block;
                width: 100%;
                height: 100%;
                border: 0;
                background: #f7f8fb;
            }

            .unsupported-content {
                box-sizing: border-box;
                display: grid;
                align-content: center;
                gap: 12px;
                width: 100%;
                height: 100%;
                padding: 32px;
                color: #334155;
                font-family: "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", "Segoe UI", sans-serif;
                text-align: center;
                word-break: keep-all;
            }

            .unsupported-content strong {
                color: #0f172a;
                font-size: 17px;
                font-weight: 800;
                line-height: 1.45;
            }

            .unsupported-content p {
                margin: 0;
                color: #64748b;
                font-size: 14px;
                font-weight: 500;
                line-height: 1.7;
            }

            button {
                position: fixed;
                top: 26px;
                right: 26px;
                display: grid;
                width: 24px;
                height: 24px;
                place-items: center;
                border: 0;
                border-radius: 999px;
                background: transparent;
                color: #4b5563;
                cursor: pointer;
                z-index: 2147483647;
            }

            button::before,
            button::after {
                content: "";
                position: absolute;
                top: 50%;
                left: 50%;
                width: 14px;
                height: 2px;
                border-radius: 999px;
                background: currentColor;
            }

            button::before {
                transform: translate(-50%, -50%) rotate(45deg);
            }

            button::after {
                transform: translate(-50%, -50%) rotate(-45deg);
            }

            button:hover {
                background: rgba(17, 24, 39, 0.05);
                color: #111827;
            }
        `;

        if (frame) {
            frame.src = chrome.runtime.getURL('popup.html?embedded=1');
            frame.title = 'EZ-ONE';
        }
        closeButton.type = 'button';
        closeButton.setAttribute('aria-label', 'EZ-ONE close');
        closeButton.title = 'Close';
        closeButton.addEventListener('click', removePanel);
        resizeHandle.className = 'resize-handle';
        resizeHandle.setAttribute('role', 'separator');
        resizeHandle.setAttribute('aria-orientation', 'vertical');
        resizeHandle.setAttribute('aria-label', 'Resize EZ-ONE panel');
        heightResizeHandle.className = 'height-resize-handle';
        heightResizeHandle.setAttribute('role', 'separator');
        heightResizeHandle.setAttribute('aria-orientation', 'horizontal');
        heightResizeHandle.setAttribute('aria-label', 'Resize EZ-ONE panel height');

        const panel = document.createElement('div');
        panel.className = 'panel';
        panel.append(resizeHandle, frame ?? createUnsupportedPageContent(), heightResizeHandle);
        shadow.append(style, panel, closeButton);
        document.documentElement.append(host);

        applyStoredPanelDimensions(panel);
        if (frame) {
            panelMessageHandler = (event) => {
                handlePanelMessage(event, frame);
            };
            window.addEventListener('message', panelMessageHandler);
        }
        resizeHandle.addEventListener('pointerdown', (event) => {
            startResize(event, panel);
        });
        heightResizeHandle.addEventListener('pointerdown', (event) => {
            startHeightResize(event, panel);
        });
    }

    function handlePanelMessage(event, frame) {
        if (event.source !== frame.contentWindow || event.data?.type !== PANEL_RESIZE_MESSAGE) {
            return;
        }
        // Popup contents scroll internally; resizing the outer panel on each content change makes it look like the window is dropping.
    }

    function createUnsupportedPageContent() {
        const content = document.createElement('section');
        const title = document.createElement('strong');
        const message = document.createElement('p');
        content.className = 'unsupported-content';
        title.textContent = '지원하지 않는 페이지입니다';
        message.textContent = '자소설닷컴 공고 또는 지원서 입력 페이지에서 다시 열어 주세요.';
        content.append(title, message);
        return content;
    }

    function canLoadPopupFrameOnCurrentPage() {
        const currentUrl = window.location.href;
        const manifest = globalThis.chrome?.runtime?.getManifest?.();
        const webAccessibleResources = Array.isArray(manifest?.web_accessible_resources)
            ? manifest.web_accessible_resources
            : [];
        return webAccessibleResources.some((entry) => {
            const resources = Array.isArray(entry?.resources) ? entry.resources : [];
            const matches = Array.isArray(entry?.matches) ? entry.matches : [];
            return resources.includes('popup.html') && matches.some((pattern) => matchPatternMatchesUrl(pattern, currentUrl));
        });
    }

    function matchPatternMatchesUrl(pattern, value) {
        const patternMatch = String(pattern ?? '').match(/^(\*|http|https):\/\/([^/]+)(\/.*)$/);
        if (!patternMatch) {
            return false;
        }

        try {
            const url = new URL(value);
            const [, scheme, hostPattern, pathPattern] = patternMatch;
            return schemeMatchesUrl(scheme, url)
                && hostMatchesPattern(hostPattern, url.hostname)
                && pathMatchesPattern(pathPattern, `${url.pathname}${url.search}${url.hash}`);
        }
        catch {
            return false;
        }
    }

    function schemeMatchesUrl(scheme, url) {
        return scheme === '*' || url.protocol === `${scheme}:`;
    }

    function hostMatchesPattern(pattern, hostname) {
        const normalizedHost = hostname.toLowerCase();
        const normalizedPattern = String(pattern ?? '').toLowerCase();
        if (normalizedPattern === '*') {
            return true;
        }
        if (normalizedPattern.startsWith('*.')) {
            const baseHost = normalizedPattern.slice(2);
            return normalizedHost === baseHost || normalizedHost.endsWith(`.${baseHost}`);
        }
        return normalizedHost === normalizedPattern;
    }

    function pathMatchesPattern(pattern, path) {
        const escapedPattern = String(pattern ?? '')
            .split('*')
            .map(escapeRegexLiteral)
            .join('.*');
        return new RegExp(`^${escapedPattern}$`).test(path);
    }

    function escapeRegexLiteral(value) {
        return value.replace(/[\\^$+?.()|{}[\]]/g, '\\$&');
    }

    async function applyStoredPanelDimensions(panel) {
        const storedWidth = await getStoredPanelWidth();
        const storedHeight = await getStoredPanelHeight();
        setPanelWidth(panel, storedWidth ?? PANEL_DEFAULT_WIDTH);
        if (storedHeight) {
            setPanelHeight(panel, storedHeight);
        }
    }

    async function getStoredPanelWidth() {
        try {
            const value = await chrome.storage.local.get([PANEL_WIDTH_STORAGE_KEY]);
            const width = Number(value?.[PANEL_WIDTH_STORAGE_KEY]);
            return Number.isFinite(width) ? width : null;
        } catch {
            return null;
        }
    }

    async function getStoredPanelHeight() {
        try {
            const value = await chrome.storage.local.get([PANEL_HEIGHT_STORAGE_KEY]);
            const height = Number(value?.[PANEL_HEIGHT_STORAGE_KEY]);
            return Number.isFinite(height) ? height : null;
        } catch {
            return null;
        }
    }

    function startResize(event, panel) {
        event.preventDefault();
        panel.classList.add('is-resizing');
        document.documentElement.style.cursor = 'ew-resize';
        document.documentElement.style.userSelect = 'none';

        const handlePointerMove = (moveEvent) => {
            const width = window.innerWidth - PANEL_RIGHT - moveEvent.clientX;
            setPanelWidth(panel, width);
        };
        const handlePointerUp = () => {
            panel.classList.remove('is-resizing');
            document.documentElement.style.cursor = '';
            document.documentElement.style.userSelect = '';
            document.removeEventListener('pointermove', handlePointerMove);
            document.removeEventListener('pointerup', handlePointerUp);
            savePanelWidth(panel);
        };

        resizeHandlePointerCapture(event);
        document.addEventListener('pointermove', handlePointerMove);
        document.addEventListener('pointerup', handlePointerUp, { once: true });
    }

    function startHeightResize(event, panel) {
        event.preventDefault();
        panel.classList.add('is-resizing');
        document.documentElement.style.cursor = 'ns-resize';
        document.documentElement.style.userSelect = 'none';

        const handlePointerMove = (moveEvent) => {
            const height = moveEvent.clientY - PANEL_TOP;
            setPanelHeight(panel, height);
        };
        const handlePointerUp = () => {
            panel.classList.remove('is-resizing');
            document.documentElement.style.cursor = '';
            document.documentElement.style.userSelect = '';
            document.removeEventListener('pointermove', handlePointerMove);
            document.removeEventListener('pointerup', handlePointerUp);
            savePanelHeight(panel);
        };

        resizeHandlePointerCapture(event);
        document.addEventListener('pointermove', handlePointerMove);
        document.addEventListener('pointerup', handlePointerUp, { once: true });
    }

    function resizeHandlePointerCapture(event) {
        try {
            event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
            // Pointer capture can fail in older embedded contexts; document listeners still handle resize.
        }
    }

    function setPanelWidth(panel, width) {
        const maxViewportWidth = Math.max(PANEL_MIN_WIDTH, window.innerWidth - PANEL_RIGHT - 12);
        const boundedWidth = Math.min(Math.max(width, PANEL_MIN_WIDTH), PANEL_MAX_WIDTH, maxViewportWidth);
        panel.style.width = `${boundedWidth}px`;
    }

    function setPanelHeight(panel, height) {
        if (!Number.isFinite(height)) {
            return;
        }
        const maxViewportHeight = Math.max(PANEL_MIN_HEIGHT, window.innerHeight - PANEL_TOP * 2);
        const boundedHeight = Math.min(Math.max(height, PANEL_MIN_HEIGHT), maxViewportHeight);
        const nextHeight = Math.round(boundedHeight);
        const currentHeight = Math.round(panel.getBoundingClientRect().height);
        if (Math.abs(currentHeight - nextHeight) < 2) {
            return;
        }
        panel.style.height = `${nextHeight}px`;
    }

    function savePanelWidth(panel) {
        const width = Math.round(panel.getBoundingClientRect().width);
        chrome.storage.local.set({ [PANEL_WIDTH_STORAGE_KEY]: width }).catch(() => {
            // Width persistence is a convenience; resizing should still work if storage is unavailable.
        });
    }

    function savePanelHeight(panel) {
        const height = Math.round(panel.getBoundingClientRect().height);
        chrome.storage.local.set({ [PANEL_HEIGHT_STORAGE_KEY]: height }).catch(() => {
            // Height persistence is a convenience; resizing should still work if storage is unavailable.
        });
    }

    function removePanel() {
        if (panelMessageHandler) {
            window.removeEventListener('message', panelMessageHandler);
            panelMessageHandler = null;
        }
        document.getElementById(HOST_ID)?.remove();
    }
})();
