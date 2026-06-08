export function createExtensionDocumentProfileApi({
    apiBaseUrl,
    getAccessToken,
    getRefreshToken,
    saveSession,
    clearSession,
    fetcher = (...args) => fetch(...args)
}) {
    const client = { apiBaseUrl, getAccessToken, getRefreshToken, saveSession, clearSession, fetcher };
    return {
        getDocumentProfile: () => request(client, '/extension/document-profile')
    };
}

async function request(client, path, retrying = false) {
    const token = await client.getAccessToken();
    if (!token) {
        throw new Error('로그인이 필요합니다.');
    }
    const response = await callFetch(client, `${client.apiBaseUrl.replace(/\/$/, '')}${path}`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
    const envelope = await response.json();
    if (response.status === 401 && !retrying) {
        const refreshed = await refreshExtensionSession(client);
        if (refreshed) {
            return request(client, path, true);
        }
    }
    if (!response.ok || !envelope.success) {
        throw new Error(envelope.error?.message ?? '요청에 실패했습니다.');
    }
    return {
        sections: envelope.data?.sections ?? {},
        customFields: envelope.data?.customFields ?? [],
        lastSavedAt: envelope.data?.lastSavedAt ?? null
    };
}

async function refreshExtensionSession(client) {
    const refreshToken = await client.getRefreshToken?.();
    if (!refreshToken) {
        await client.clearSession?.();
        throw new Error('로그인이 만료되었습니다. 다시 로그인해 주세요.');
    }
    const response = await callFetch(client, `${client.apiBaseUrl.replace(/\/$/, '')}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
    });
    const envelope = await response.json();
    if (!response.ok || !envelope.success || !envelope.data?.accessToken || !envelope.data?.refreshToken) {
        await client.clearSession?.();
        throw new Error('로그인이 만료되었습니다. 다시 로그인해 주세요.');
    }
    await client.saveSession?.(envelope.data);
    return true;
}

function callFetch(client, url, init) {
    const fetcher = client.fetcher;
    return fetcher(url, init);
}
