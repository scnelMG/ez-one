import { handleExternalAuthMessage } from './shared/auth/extensionAuth';

chrome.action.onClicked.addListener(async (tab) => {
    if (!canInjectPanel(tab)) {
        return;
    }
    await injectPanelSafely(chrome.scripting, tab);
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
    handleExternalAuthMessage(chrome.storage.local, message)
        .then(async (accepted) => {
        let returnedToSource = false;
        if (accepted) {
            returnedToSource = await returnToExtensionTabAfterAuth(chrome.tabs, chrome.scripting, sender.tab?.id, message?.sourceTabId, message?.sourceUrl);
        }
        sendResponse({ accepted, returnedToSource });
    })
        .catch((error) => sendResponse({
        accepted: false,
        returnedToSource: false,
        message: error instanceof Error ? error.message : 'Auth session could not be stored.'
    }));
    return true;
});

async function returnToExtensionTabAfterAuth(tabs, scripting, senderTabId, sourceTabId, sourceUrl) {
    const parsedSourceTabId = parsePositiveInteger(sourceTabId);
    if (parsedSourceTabId === null) {
        return await returnToSourceUrlFallback(tabs, senderTabId, sourceUrl);
    }
    let sourceTab;
    try {
        sourceTab = await tabs.update(parsedSourceTabId, { active: true });
    }
    catch {
        return await returnToSourceUrlFallback(tabs, senderTabId, sourceUrl);
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
    return true;
}

async function returnToSourceUrlFallback(tabs, senderTabId, sourceUrl) {
    const safeSourceUrl = parseSafeHttpUrl(sourceUrl);
    if (!tabs || !safeSourceUrl) {
        return false;
    }
    try {
        if (Number.isInteger(senderTabId) && senderTabId > 0) {
            await tabs.update(senderTabId, { url: safeSourceUrl, active: true });
            return true;
        }
        await tabs.create({ url: safeSourceUrl, active: true });
        return true;
    }
    catch {
        return false;
    }
}

async function ensurePanelOpenAfterAuth(scripting, tab) {
    if (!scripting || !canInjectPanel(tab)) {
        return;
    }
    await removeExistingPanelHost(scripting, tab.id);
    await injectPanelSafely(scripting, tab);
}

async function removeExistingPanelHost(scripting, tabId) {
    try {
        await scripting.executeScript({
            target: { tabId },
            func: () => document.getElementById('ezone-extension-panel-host')?.remove()
        });
    }
    catch (error) {
        if (!isTransientScriptingError(error)) {
            throw error;
        }
    }
}

async function injectPanelSafely(scripting, tab) {
    if (!scripting || !canInjectPanel(tab)) {
        return false;
    }
    try {
        await scripting.executeScript({
            target: { tabId: tab.id },
            files: ['assets/panelHost.js']
        });
        return true;
    }
    catch (error) {
        if (isTransientScriptingError(error)) {
            return false;
        }
        console.warn('EZ-ONE panel injection failed', error);
        return false;
    }
}

function isTransientScriptingError(error) {
    const message = error instanceof Error ? error.message : String(error ?? '');
    return [
        'Frame with ID 0 was removed',
        'The tab was closed',
        'No tab with id',
        'Cannot access contents of url'
    ].some((text) => message.includes(text));
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

function parseSafeHttpUrl(value) {
    if (typeof value !== 'string') {
        return null;
    }
    try {
        const url = new URL(value);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            return null;
        }
        return url.href;
    }
    catch {
        return null;
    }
}
