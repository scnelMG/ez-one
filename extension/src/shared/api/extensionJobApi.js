export function createExtensionJobApi({ apiBaseUrl, getAccessToken, fetcher = fetch }) {
    return {
        preview: (payload) => request(apiBaseUrl, getAccessToken, fetcher, '/extension/jobs/preview', payload),
        save: (payload) => request(apiBaseUrl, getAccessToken, fetcher, '/extension/jobs/save', payload)
    };
}
async function request(apiBaseUrl, getAccessToken, fetcher, path, payload) {
    const token = await getAccessToken();
    if (!token) {
        throw new Error('로그인이 필요합니다.');
    }
    const response = await fetcher(`${apiBaseUrl.replace(/\/$/, '')}${path}`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });
    const envelope = await response.json();
    if (!response.ok || !envelope.success) {
        throw new Error(envelope.error?.message ?? '요청에 실패했습니다.');
    }
    return envelope.data;
}
