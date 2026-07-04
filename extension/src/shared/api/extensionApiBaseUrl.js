export const EXTENSION_API_BASE_URL_MISSING_MESSAGE =
    '확장프로그램 서버 주소가 설정되지 않았습니다. 확장프로그램을 최신 버전으로 업데이트해 주세요.';

export function resolveApiBaseUrlCandidates(apiBaseUrl, fallbackBaseUrls = []) {
    const candidates = [
        apiBaseUrl,
        ...(Array.isArray(fallbackBaseUrls) ? fallbackBaseUrls : String(fallbackBaseUrls).split(','))
    ]
        .map((value) => String(value ?? '').trim())
        .filter(Boolean);
    return [...new Set(candidates)];
}

export function requireApiBaseUrlCandidates(apiBaseUrls) {
    if (!Array.isArray(apiBaseUrls) || apiBaseUrls.length === 0) {
        throw new Error(EXTENSION_API_BASE_URL_MISSING_MESSAGE);
    }
}

export function requireApiBaseUrl(apiBaseUrl) {
    const normalized = String(apiBaseUrl ?? '').trim();
    if (!normalized) {
        throw new Error(EXTENSION_API_BASE_URL_MISSING_MESSAGE);
    }
    return normalized;
}
