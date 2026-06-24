export function messageFromError(error, fallback) {
    const responseMessage = error?.response?.data?.error?.message ?? error?.response?.data?.message;
    if (typeof responseMessage === 'string' && responseMessage.trim()) {
        return responseMessage;
    }
    if (error instanceof Error && error.message.trim()) {
        return error.message;
    }
    return fallback;
}
