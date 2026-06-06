export function createExtensionDocumentProfileApi({ apiBaseUrl, getAccessToken, fetcher = fetch }) {
    return {
        getDocumentProfile: () => request(apiBaseUrl, getAccessToken, fetcher, '/extension/document-profile')
    };
}

async function request(apiBaseUrl, getAccessToken, fetcher, path) {
    const token = await getAccessToken();
    if (!token) {
        throw new Error('로그인이 필요합니다.');
    }
    const response = await fetcher(`${apiBaseUrl.replace(/\/$/, '')}${path}`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
    const envelope = await response.json();
    if (!response.ok || !envelope.success) {
        throw new Error(envelope.error?.message ?? '요청에 실패했습니다.');
    }
    return {
        sections: envelope.data?.sections ?? {},
        customFields: envelope.data?.customFields ?? [],
        lastSavedAt: envelope.data?.lastSavedAt ?? null
    };
}
