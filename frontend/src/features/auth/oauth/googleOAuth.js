const OAUTH_STATE_KEY = 'ezone.oauthState';
export function createOAuthState(redirectPath) {
    const nonce = crypto.randomUUID();
    const state = {
        nonce,
        redirectPath: normalizeRedirectPath(redirectPath)
    };
    sessionStorage.setItem(OAUTH_STATE_KEY, JSON.stringify(state));
    return nonce;
}
export function consumeOAuthState(nonce) {
    const rawState = sessionStorage.getItem(OAUTH_STATE_KEY);
    sessionStorage.removeItem(OAUTH_STATE_KEY);
    if (!rawState) {
        throw new Error('로그인 상태 값을 찾을 수 없습니다. 다시 로그인해 주세요.');
    }
    const state = JSON.parse(rawState);
    if (state.nonce !== nonce) {
        throw new Error('로그인 상태 값이 일치하지 않습니다. 다시 로그인해 주세요.');
    }
    return normalizeRedirectPath(state.redirectPath);
}
export function buildGoogleOAuthUrl({ clientId, redirectUri, state }) {
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('state', state);
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'consent');
    return url;
}
export function getGoogleClientId() {
    return import.meta.env.VITE_GOOGLE_CLIENT_ID;
}
export function getGoogleRedirectUri() {
    return `${window.location.origin}/login/callback`;
}
function normalizeRedirectPath(path) {
    if (!path.startsWith('/') || path.startsWith('//') || path.startsWith('/login')) {
        return '/main';
    }
    return path;
}
