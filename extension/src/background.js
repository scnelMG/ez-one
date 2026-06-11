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
        .then((accepted) => sendResponse({ accepted }))
        .catch((error) => sendResponse({
        accepted: false,
        message: error instanceof Error ? error.message : 'Auth session could not be stored.'
    }));
    return true;
});
