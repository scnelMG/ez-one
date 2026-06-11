(() => {
    const HOST_ID = 'ezone-extension-panel-host';
    const PANEL_WIDTH = 360;
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
                width: min(${PANEL_WIDTH}px, calc(100vw - 24px));
                height: min(${PANEL_MAX_HEIGHT}px, max(${PANEL_MIN_HEIGHT}px, calc(100vh - 24px)));
                overflow: hidden;
                border: 1px solid rgba(17, 24, 39, 0.14);
                border-radius: 14px;
                background: #f7f8fb;
                box-shadow: 0 18px 46px rgba(17, 24, 39, 0.28);
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

        const panel = document.createElement('div');
        panel.className = 'panel';
        panel.append(frame);
        shadow.append(style, panel, closeButton);
        document.documentElement.append(host);
    }

    function removePanel() {
        document.getElementById(HOST_ID)?.remove();
    }
})();
