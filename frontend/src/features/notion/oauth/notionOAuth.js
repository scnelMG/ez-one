const NOTION_OAUTH_STATE_KEY = 'ezone.notionOAuthState';
const NOTION_OAUTH_STATE_TTL_MS = 30 * 60 * 1000;

export function createNotionOAuthState() {
    const state = crypto.randomUUID();
    sessionStorage.setItem(NOTION_OAUTH_STATE_KEY, JSON.stringify({
        state,
        createdAt: Date.now()
    }));
    return state;
}

export function consumeNotionOAuthState(state) {
    const rawState = sessionStorage.getItem(NOTION_OAUTH_STATE_KEY);
    sessionStorage.removeItem(NOTION_OAUTH_STATE_KEY);
    if (!rawState) {
        throw new Error('Notion OAuth state was not found.');
    }
    const parsed = JSON.parse(rawState);
    if (parsed.state !== state || Date.now() - Number(parsed.createdAt ?? 0) > NOTION_OAUTH_STATE_TTL_MS) {
        throw new Error('Notion OAuth state is invalid.');
    }
}

export function buildNotionOAuthUrl({ clientId, redirectUri, state }) {
    const url = new URL('https://api.notion.com/v1/oauth/authorize');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('owner', 'user');
    url.searchParams.set('state', state);
    return url;
}

export function getNotionClientId() {
    return import.meta.env.VITE_NOTION_CLIENT_ID;
}

export function getNotionRedirectUri() {
    if (import.meta.env.VITE_NOTION_REDIRECT_URI) {
        return import.meta.env.VITE_NOTION_REDIRECT_URI;
    }
    return `${window.location.origin}/mypage/notion`;
}

export function redirectToNotionOAuth(url) {
    window.location.href = url.toString();
}
