(() => {
    const HOST_ID = 'ezone-extension-panel-host';
    const PANEL_WIDTH_STORAGE_KEY = 'ezonePanelWidth';
    const PANEL_DEFAULT_WIDTH = 360;
    const PANEL_MIN_WIDTH = 320;
    const PANEL_MAX_WIDTH = 520;
    const PANEL_TOP = 12;
    const PANEL_RIGHT = 12;
    const PANEL_MIN_HEIGHT = 360;
    const PANEL_MAX_HEIGHT = 560;

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
                height: min(${PANEL_MAX_HEIGHT}px, max(${PANEL_MIN_HEIGHT}px, calc(100vh - 24px)));
                overflow: hidden;
                border: 1px solid rgba(17, 24, 39, 0.14);
                border-radius: 14px;
                background: #f7f8fb;
                box-shadow: 0 18px 46px rgba(17, 24, 39, 0.28);
            }

            .panel.is-resizing iframe {
                pointer-events: none;
            }

            .resize-handle {
                position: absolute;
                top: 14px;
                bottom: 14px;
                left: -6px;
                width: 12px;
                cursor: ew-resize;
                z-index: 2147483647;
            }

            .resize-handle::after {
                content: "";
                position: absolute;
                top: 50%;
                left: 5px;
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

        const panel = document.createElement('div');
        panel.className = 'panel';
        panel.append(resizeHandle, frame);
        shadow.append(style, panel, closeButton);
        document.documentElement.append(host);

        applyStoredPanelWidth(panel);
        resizeHandle.addEventListener('pointerdown', (event) => {
            startResize(event, panel);
        });
    }

    async function applyStoredPanelWidth(panel) {
        const storedWidth = await getStoredPanelWidth();
        setPanelWidth(panel, storedWidth ?? PANEL_DEFAULT_WIDTH);
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

    function savePanelWidth(panel) {
        const width = Math.round(panel.getBoundingClientRect().width);
        chrome.storage.local.set({ [PANEL_WIDTH_STORAGE_KEY]: width }).catch(() => {
            // Width persistence is a convenience; resizing should still work if storage is unavailable.
        });
    }

    function removePanel() {
        document.getElementById(HOST_ID)?.remove();
    }
})();
