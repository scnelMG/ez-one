const OAUTH_STATE_KEY = 'ezone.oauthState';
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

export function createOAuthState(redirectPath) {
    const nonce = crypto.randomUUID();
    const store = loadOAuthStateStore();
    store[nonce] = {
        redirectPath: normalizeRedirectPath(redirectPath),
        createdAt: Date.now()
    };
    saveOAuthStateStore(store);
    return nonce;
}

export function consumeOAuthState(nonce) {
    const store = loadOAuthStateStore();
    const state = store[nonce];
    if (!state) {
        throw new Error('로그인 상태 값을 찾을 수 없습니다. 다시 로그인해 주세요.');
    }
    delete store[nonce];
    saveOAuthStateStore(store);
    return normalizeRedirectPath(state.redirectPath);
}

export function buildGoogleOAuthUrl({ clientId, redirectUri, state, selectAccount = false }) {
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('state', state);
    url.searchParams.set('access_type', 'offline');
    if (selectAccount) {
        url.searchParams.set('prompt', 'select_account');
    }
    return url;
}

export function getGoogleClientId() {
    return import.meta.env.VITE_GOOGLE_CLIENT_ID;
}

export function getGoogleRedirectUri() {
    if (import.meta.env.VITE_GOOGLE_REDIRECT_URI) {
        return import.meta.env.VITE_GOOGLE_REDIRECT_URI;
    }
    return `${window.location.origin}/login/callback`;
}

function normalizeRedirectPath(path) {
    if (!path.startsWith('/') || path.startsWith('//') || path.startsWith('/login')) {
        return '/';
    }
    return path;
}

function loadOAuthStateStore() {
    const rawState = sessionStorage.getItem(OAUTH_STATE_KEY);
    if (!rawState) {
        return {};
    }
    try {
        const parsed = JSON.parse(rawState);
        if (parsed?.nonce && parsed?.redirectPath) {
            return {
                [parsed.nonce]: {
                    redirectPath: parsed.redirectPath,
                    createdAt: Date.now()
                }
            };
        }
        const now = Date.now();
        return Object.fromEntries(
            Object.entries(parsed ?? {}).filter(([, state]) => {
                return state?.redirectPath && now - Number(state.createdAt ?? 0) <= OAUTH_STATE_TTL_MS;
            })
        );
    } catch {
        sessionStorage.removeItem(OAUTH_STATE_KEY);
        return {};
    }
}

function saveOAuthStateStore(store) {
    if (Object.keys(store).length === 0) {
        sessionStorage.removeItem(OAUTH_STATE_KEY);
        return;
    }
    sessionStorage.setItem(OAUTH_STATE_KEY, JSON.stringify(store));
}
