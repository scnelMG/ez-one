import { handleExternalAuthMessage } from './shared/auth/extensionAuth';
chrome.runtime.onMessageExternal.addListener((message, _sender, sendResponse) => {
    handleExternalAuthMessage(chrome.storage.local, message)
        .then((accepted) => sendResponse({ accepted }))
        .catch((error) => sendResponse({
        accepted: false,
        message: error instanceof Error ? error.message : 'Auth session could not be stored.'
    }));
    return true;
});
