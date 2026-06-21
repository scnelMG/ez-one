export const ACCESS_TOKEN_KEY = 'ezoneAccessToken';
export const REFRESH_TOKEN_KEY = 'ezoneRefreshToken';
export const CURRENT_USER_KEY = 'ezoneCurrentUser';
export const PENDING_EXTENSION_CONTINUATION_KEY = 'ezonePendingExtensionContinuation';
export function buildWebLoginUrl({ webAppUrl, currentUrl, sourceTabId }) {
    const url = new URL('/login', webAppUrl);
    const connectUrl = new URL('/extension/connect', webAppUrl);
    connectUrl.searchParams.set('sourceUrl', currentUrl);
    if (Number.isInteger(sourceTabId) && sourceTabId > 0) {
        connectUrl.searchParams.set('sourceTabId', String(sourceTabId));
    }
    const connectPath = `${connectUrl.pathname}${connectUrl.search}`;
    url.searchParams.set('redirect', connectPath);
    return url;
}
export async function handleExternalAuthMessage(storage, message, navigation = {}) {
    if (!isAuthMessage(message)) {
        return false;
    }
    try {
        await saveStoredSession(storage, message);
    }
    catch (error) {
        if (isExtensionContextInvalidatedError(error)) {
            return false;
        }
        throw error;
    }
    await returnToSourceTab(navigation.tabs, message.sourceTabId);
    return true;
}
export async function saveStoredSession(storage, session) {
    await storage.set({
        [ACCESS_TOKEN_KEY]: session.accessToken,
        [REFRESH_TOKEN_KEY]: session.refreshToken,
        [CURRENT_USER_KEY]: session.user
    });
}
export async function getStoredSession(storage) {
    const values = await storage.get([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, CURRENT_USER_KEY]);
    const accessToken = values[ACCESS_TOKEN_KEY];
    const refreshToken = values[REFRESH_TOKEN_KEY];
    if (typeof accessToken !== 'string' || typeof refreshToken !== 'string') {
        return null;
    }
    return {
        accessToken,
        refreshToken,
        user: values[CURRENT_USER_KEY]
    };
}
export async function clearStoredSession(storage) {
    await storage.remove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, CURRENT_USER_KEY]);
}
function isAuthMessage(message) {
    if (!message || typeof message !== 'object') {
        return false;
    }
    const value = message;
    return value.type === 'EZONE_EXTENSION_AUTH_SESSION' &&
        typeof value.accessToken === 'string' &&
        typeof value.refreshToken === 'string';
}

function isExtensionContextInvalidatedError(error) {
    const message = error instanceof Error ? error.message : String(error ?? '');
    return /extension context invalidated/i.test(message);
}

async function returnToSourceTab(tabs, sourceTabId) {
    const tabId = parsePositiveInteger(sourceTabId);
    if (!tabs || tabId === null) {
        return;
    }
    try {
        await tabs.update(tabId, { active: true });
    }
    catch {
        // The web page still falls back to sourceUrl when the original tab is gone.
    }
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
