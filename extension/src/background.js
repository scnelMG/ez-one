import { handleExternalAuthMessage } from './shared/auth/extensionAuth';
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
