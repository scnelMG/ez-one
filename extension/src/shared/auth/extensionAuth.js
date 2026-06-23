export const ACCESS_TOKEN_KEY = 'ezoneAccessToken';
export const REFRESH_TOKEN_KEY = 'ezoneRefreshToken';
export const CURRENT_USER_KEY = 'ezoneCurrentUser';
export const PENDING_EXTENSION_CONTINUATION_KEY = 'ezonePendingExtensionContinuation';
const SESSION_VALIDATION_TIMEOUT_MS = 1500;
const sessionValidationPromises = new Map();
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
    let values;
    try {
        values = await storage.get([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, CURRENT_USER_KEY]);
    }
    catch (error) {
        if (isExtensionContextInvalidatedError(error)) {
            return null;
        }
        throw error;
    }
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
export async function validateStoredSession(storage, options = {}) {
    const session = await getStoredSession(storage);
    if (!session) {
        return null;
    }
    const inFlightValidation = sessionValidationPromises.get(session.refreshToken);
    if (inFlightValidation) {
        return await inFlightValidation;
    }
    const validation = refreshStoredSession(storage, session, options)
        .finally(() => sessionValidationPromises.delete(session.refreshToken));
    sessionValidationPromises.set(session.refreshToken, validation);
    return await validation;
}

async function refreshStoredSession(storage, session, options) {
    const apiBaseUrl = options.apiBaseUrl ?? '';
    const fetcher = options.fetcher ?? globalThis.fetch?.bind(globalThis);
    if (!fetcher) {
        return session;
    }
    try {
        const response = await fetchWithTimeout(fetcher, `${apiBaseUrl.replace(/\/$/, '')}/auth/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                refreshToken: session.refreshToken
            })
        });
        if (!response?.ok) {
            if (isAuthInvalidStatus(response?.status)) {
                await clearStoredSessionIfRefreshUnchanged(storage, session.refreshToken);
                return null;
            }
            if (options.requireFreshSession) {
                return null;
            }
            return session;
        }
        const envelope = await response.json();
        if (envelope?.success !== true) {
            if (isAuthInvalidEnvelope(envelope)) {
                await clearStoredSessionIfRefreshUnchanged(storage, session.refreshToken);
                return null;
            }
            if (options.requireFreshSession) {
                return null;
            }
            return session;
        }
        const refreshedSession = normalizeRefreshSession(envelope?.data);
        if (!refreshedSession) {
            if (options.requireFreshSession) {
                return null;
            }
            return session;
        }
        await saveStoredSession(storage, refreshedSession);
        return refreshedSession;
    }
    catch {
        if (options.requireFreshSession) {
            return null;
        }
        return session;
    }
}
export async function clearStoredSession(storage) {
    try {
        await storage.remove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, CURRENT_USER_KEY]);
    }
    catch (error) {
        if (!isExtensionContextInvalidatedError(error)) {
            throw error;
        }
    }
}

async function clearStoredSessionIfRefreshUnchanged(storage, refreshToken) {
    const latestSession = await getStoredSession(storage);
    if (latestSession?.refreshToken === refreshToken) {
        await clearStoredSession(storage);
    }
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

function normalizeRefreshSession(value) {
    if (!value || typeof value !== 'object') {
        return null;
    }
    if (typeof value.accessToken !== 'string' || typeof value.refreshToken !== 'string') {
        return null;
    }
    return {
        accessToken: value.accessToken,
        refreshToken: value.refreshToken,
        user: value.user
    };
}

function isAuthInvalidStatus(status) {
    return status === 401 || status === 403;
}

function isAuthInvalidEnvelope(envelope) {
    const message = String(envelope?.error?.message ?? envelope?.message ?? '');
    return /invalid|expired|revoked|unauthorized|forbidden|만료|유효하지|권한/i.test(message);
}

function fetchWithTimeout(fetcher, url, init) {
    if (typeof AbortController !== 'function') {
        return fetcher(url, init);
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SESSION_VALIDATION_TIMEOUT_MS);
    return fetcher(url, {
        ...init,
        signal: controller.signal
    }).finally(() => clearTimeout(timeoutId));
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
