export function createExtensionJobApi({
    apiBaseUrl,
    getAccessToken,
    getRefreshToken,
    saveSession,
    clearSession,
    fetcher = (...args) => fetch(...args)
}) {
    const client = { apiBaseUrl, getAccessToken, getRefreshToken, saveSession, clearSession, fetcher };
    return {
        preview: (payload) => request(client, '/extension/jobs/preview', payload),
        save: (payload) => request(client, '/extension/jobs/save', payload)
    };
}
async function request(client, path, payload, retrying = false) {
    const token = await client.getAccessToken();
    if (!token) {
        throw new Error('로그인이 필요합니다.');
    }
    const response = await callFetch(client, `${client.apiBaseUrl.replace(/\/$/, '')}${path}`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });
    const envelope = await response.json();
    if (response.status === 401 && !retrying) {
        const refreshed = await refreshExtensionSession(client);
        if (refreshed) {
            return request(client, path, payload, true);
        }
    }
    if (!response.ok || !envelope.success) {
        throw new Error(envelope.error?.message ?? '요청에 실패했습니다.');
    }
    return envelope.data;
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    return fetcher(url, {
        ...init,
        signal: controller.signal
    })
        .catch((error) => {
        if (error?.name === 'AbortError') {
            throw new Error('서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.');
        }
        throw new Error('서버에 연결하지 못했습니다. EZ-ONE 서버가 켜져 있는지 확인해 주세요.');
    })
        .finally(() => clearTimeout(timeoutId));
}
