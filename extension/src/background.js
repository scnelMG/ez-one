import { handleExternalAuthMessage } from './shared/auth/extensionAuth';

chrome.action.onClicked.addListener(async (tab) => {
    try {
        if (!canInjectPanel(tab)) {
            return;
        }

        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['assets/panelHost.js']
        });
    } catch (error) {
        console.error(error);
    }
});

function canInjectPanel(tab) {
    if (!tab?.id || !tab.url) {
        return false;
    }

    try {
        const url = new URL(tab.url);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
    handleExternalAuthMessage(chrome.storage.local, message, {
        tabs: chrome.tabs,
        senderTabId: sender.tab?.id
    })
        .then((accepted) => {
        sendResponse({ accepted });
        if (accepted) {
            void returnToExtensionTabAfterAuth(chrome.tabs, chrome.scripting, sender.tab?.id, message?.sourceTabId, message?.sourceUrl);
        }
    })
        .catch((error) => sendResponse({
        accepted: false,
        message: error instanceof Error ? error.message : 'Auth session could not be stored.'
    }));
    return true;
});

async function returnToExtensionTabAfterAuth(tabs, scripting, senderTabId, sourceTabId, sourceUrl) {
    const parsedSourceTabId = parsePositiveInteger(sourceTabId);
    if (parsedSourceTabId === null) {
        return;
    }
    let sourceTab;
    try {
        sourceTab = await tabs.update(parsedSourceTabId, { active: true });
    }
    catch {
        // Leave the auth tab open so the user can use the web fallback if the source tab is gone.
        return;
    }
    try {
        await ensurePanelOpenAfterAuth(scripting, {
            ...(sourceTab ?? {}),
            id: parsedSourceTabId,
            url: sourceTab?.url ?? sourceUrl
        });
    }
    catch {
        // Returning to the source tab is the critical path; the user can reopen the panel manually if reinjection fails.
    }
    finally {
        closeAuthTabAfterResponse(tabs, senderTabId, parsedSourceTabId);
    }
}

async function ensurePanelOpenAfterAuth(scripting, tab) {
    if (!scripting || !canInjectPanel(tab)) {
        return;
    }
    const [panelState] = await scripting.executeScript({
        target: { tabId: tab.id },
        func: () => Boolean(document.getElementById('ezone-extension-panel-host'))
    });
    if (panelState?.result) {
        return;
    }
    await scripting.executeScript({
        target: { tabId: tab.id },
        files: ['assets/panelHost.js']
    });
}

function closeAuthTabAfterResponse(tabs, senderTabId, sourceTabId) {
    const parsedSourceTabId = parsePositiveInteger(sourceTabId);
    if (!Number.isInteger(senderTabId) || senderTabId <= 0 || parsedSourceTabId === null || senderTabId === parsedSourceTabId) {
        return;
    }
    setTimeout(() => {
        tabs.remove(senderTabId).catch(() => {
        // The user may close the auth tab before cleanup runs.
        });
    }, 120);
}

function parsePositiveInteger(value) {
    if (Number.isInteger(value) && value > 0) {
        return value;
    }
    if (typeof value === 'string' && /^\d+$/.test(value)) {
        const parsed = Number(value);
        return parsed > 0 ? parsed : null;
    }
    return null;
}
