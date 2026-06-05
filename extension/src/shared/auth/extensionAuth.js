export const ACCESS_TOKEN_KEY = 'ezoneAccessToken';
export const REFRESH_TOKEN_KEY = 'ezoneRefreshToken';
export const CURRENT_USER_KEY = 'ezoneCurrentUser';
export function buildWebLoginUrl({ webAppUrl, currentUrl }) {
    const url = new URL('/', webAppUrl);
    const connectPath = `/extension/connect?sourceUrl=${encodeURIComponent(currentUrl)}`;
    url.searchParams.set('redirect', connectPath);
    return url;
}
export async function handleExternalAuthMessage(storage, message) {
    if (!isAuthMessage(message)) {
        return false;
    }
    await storage.set({
        [ACCESS_TOKEN_KEY]: message.accessToken,
        [REFRESH_TOKEN_KEY]: message.refreshToken,
        [CURRENT_USER_KEY]: message.user
    });
    return true;
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
