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
        const frame = document.createElement('iframe');
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

        frame.src = chrome.runtime.getURL('popup.html?embedded=1');
        frame.title = 'EZ-ONE';
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
        panel.append(resizeHandle, frame, heightResizeHandle);
        shadow.append(style, panel, closeButton);
        document.documentElement.append(host);

        applyStoredPanelDimensions(panel);
        panelMessageHandler = (event) => {
            handlePanelMessage(event, frame);
        };
        window.addEventListener('message', panelMessageHandler);
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
