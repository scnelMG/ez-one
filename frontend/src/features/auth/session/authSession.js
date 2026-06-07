const ACCESS_TOKEN_KEY = 'ezone.accessToken';
const REFRESH_TOKEN_KEY = 'ezone.refreshToken';
const CURRENT_USER_KEY = 'ezone.currentUser';
export function saveAuthSession(response) {
    localStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
    saveCurrentUser(response.user);
}
export function saveCurrentUser(user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
}
export function clearAuthSession() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(CURRENT_USER_KEY);
}
export function getAccessToken() {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
}
export function getRefreshToken() {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
}
export function getCurrentUser() {
    const rawUser = localStorage.getItem(CURRENT_USER_KEY);
    if (!rawUser) {
        return null;
    }
    try {
        return JSON.parse(rawUser);
    }
    catch {
        clearAuthSession();
        return null;
    }
}
export function requiresOnboarding() {
    return getCurrentUser()?.onboardingRequired === true;
}
export function isAuthenticated() {
    return Boolean(getAccessToken());
}
