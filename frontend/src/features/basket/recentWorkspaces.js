export const RECENT_WORKSPACES_KEY = 'ezone.recentWorkspaces';
const MAX_RECENT_WORKSPACES = 1;

export function getRecentWorkspaceWithTime() {
    try {
        const parsed = JSON.parse(localStorage.getItem(RECENT_WORKSPACES_KEY) ?? '[]');
        if (Array.isArray(parsed) && parsed.length > 0) {
            const first = parsed[0];
            if (typeof first === 'object' && first.id) {
                return first;
            } else if (typeof first === 'string') {
                return { id: first, time: new Date().toISOString() };
            }
        }
        return null;
    }
    catch {
        return null;
    }
}

export function getRecentWorkspaceIds() {
    try {
        const parsed = JSON.parse(localStorage.getItem(RECENT_WORKSPACES_KEY) ?? '[]');
        return Array.isArray(parsed) ? parsed.map(item => typeof item === 'object' ? item.id : String(item)).filter(Boolean).slice(0, MAX_RECENT_WORKSPACES) : [];
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
    const newItem = { id: normalizedId, time: new Date().toISOString() };
    const nextItems = [
        newItem,
        ...JSON.parse(localStorage.getItem(RECENT_WORKSPACES_KEY) ?? '[]').filter(item => {
            const id = typeof item === 'object' ? item.id : String(item);
            return id !== normalizedId;
        })
    ].slice(0, MAX_RECENT_WORKSPACES);

    localStorage.setItem(RECENT_WORKSPACES_KEY, JSON.stringify(nextItems));
}

export function isRecentWorkspace(workspaceId) {
    return getRecentWorkspaceIds().includes(String(workspaceId ?? ''));
}
