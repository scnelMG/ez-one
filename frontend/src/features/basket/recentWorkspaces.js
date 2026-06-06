export const RECENT_WORKSPACES_KEY = 'ezone.recentWorkspaces';
const MAX_RECENT_WORKSPACES = 5;

export function getRecentWorkspaceIds() {
    try {
        const parsed = JSON.parse(localStorage.getItem(RECENT_WORKSPACES_KEY) ?? '[]');
        return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
    }
    catch {
        return [];
    }
}

export function rememberRecentWorkspace(workspaceId) {
    const normalizedId = String(workspaceId ?? '').trim();
    if (!normalizedId) {
        return;
    }
    const nextIds = [
        normalizedId,
        ...getRecentWorkspaceIds().filter((recentId) => recentId !== normalizedId)
    ].slice(0, MAX_RECENT_WORKSPACES);
    localStorage.setItem(RECENT_WORKSPACES_KEY, JSON.stringify(nextIds));
}

export function isRecentWorkspace(workspaceId) {
    return getRecentWorkspaceIds().includes(String(workspaceId ?? ''));
}
