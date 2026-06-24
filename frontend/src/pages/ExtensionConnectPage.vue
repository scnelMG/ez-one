<template>
  <main class="auth-page">
    <section class="auth-panel" aria-labelledby="extension-connect-title">
      <img class="auth-logo" src="../assets/ez-one-logo-final.png" alt="EZ-ONE" />
      <h1 id="extension-connect-title">확장프로그램 연결</h1>
      <p>{{ statusMessage }}</p>
      <RouterLink v-if="hasError" class="primary-button" to="/login">다시 로그인하기</RouterLink>
      <RouterLink v-else class="primary-button" to="/main">EZ-ONE 열기</RouterLink>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { authApi } from '@/features/auth/api/authApi';
import { getAccessToken } from '@/features/auth/session/authSession';

const DEFAULT_LOCAL_EXTENSION_ID = 'ikpeibohnopmikegoogggmdipmhmiadi';
const route = useRoute();
const errorMessage = ref('');
const completed = ref(false);
const hasError = computed(() => Boolean(errorMessage.value));
const statusMessage = computed(() => {
    if (errorMessage.value) {
        return errorMessage.value;
    }
    return completed.value
        ? '확장프로그램 연결이 완료되었습니다. 원래 공고 탭으로 돌아갑니다.'
        : '로그인 세션을 확장프로그램에 연결하고 있습니다.';
});
onMounted(async () => {
    const extensionIds = extensionIdCandidates(import.meta.env.VITE_EXTENSION_ID);
    if (extensionIds.length === 0) {
        errorMessage.value = '확장프로그램 ID가 설정되지 않았습니다. VITE_EXTENSION_ID를 설정해 주세요.';
        return;
    }
    if (!getAccessToken()) {
        errorMessage.value = '로그인 세션을 찾지 못했습니다. 다시 로그인해 주세요.';
        return;
    }
    let canReturnToSourceOnConnectFailure = false;
    try {
        const extensionSession = await authApi.issueExtensionSession();
        const authMessage = {
            type: 'EZONE_EXTENSION_AUTH_SESSION',
            accessToken: extensionSession.accessToken,
            refreshToken: extensionSession.refreshToken,
            user: extensionSession.user
        };
        const sourceTabId = parseSourceTabId(route.query.sourceTabId);
        if (sourceTabId !== null) {
            authMessage.sourceTabId = sourceTabId;
        }
        const sourceUrl = parseSourceUrl(route.query.sourceUrl);
        if (sourceUrl) {
            authMessage.sourceUrl = sourceUrl;
        }
        canReturnToSourceOnConnectFailure = true;
        const response = await sendExtensionMessageToAvailableExtension(extensionIds, authMessage);
        if (!response?.accepted) {
            throw new Error(response?.message ?? '확장프로그램이 로그인 세션을 받지 못했습니다.');
        }
        completed.value = true;
        if (response.returnedToSource === false) {
            returnToSourceUrl(route.query.sourceUrl);
            return;
        }
        if (sourceTabId === null) {
            returnToSourceUrl(route.query.sourceUrl);
        }
    }
    catch (error) {
        if (canReturnToSourceOnConnectFailure && returnToSourceUrl(route.query.sourceUrl)) {
            return;
        }
        errorMessage.value = normalizeExtensionConnectError(error);
    }
});

function normalizeExtensionConnectError(error) {
    const message = error instanceof Error ? error.message : '';
    if (/401|unauthorized|로그인이 만료|authentication is required/i.test(message)) {
        return '로그인 시간이 만료되었습니다. 다시 로그인해 주세요.';
    }
    return message || '확장프로그램 연결에 실패했습니다.';
}

async function sendExtensionMessageToAvailableExtension(extensionIds, message) {
    let lastDeliveryError = null;
    for (const extensionId of extensionIds) {
        try {
            return await sendExtensionMessage(extensionId, message);
        }
        catch (error) {
            if (!isExtensionMessageDeliveryError(error)) {
                throw error;
            }
            lastDeliveryError = error;
        }
    }
    throw lastDeliveryError ?? new Error('확장프로그램 연결에 실패했습니다.');
}

function sendExtensionMessage(extensionId, message) {
    return new Promise((resolve, reject) => {
        const runtime = window.chrome?.runtime;
        if (!runtime?.sendMessage) {
            reject(new Error('Chrome 확장프로그램 환경에서 다시 시도해 주세요.'));
            return;
        }
        runtime.sendMessage(extensionId, message, (response) => {
            const lastError = runtime.lastError;
            if (lastError) {
                reject(new Error(lastError.message));
                return;
            }
            resolve(response);
        });
    });
}

function extensionIdCandidates(configuredId) {
    const candidates = [configuredId, DEFAULT_LOCAL_EXTENSION_ID]
        .map((value) => String(value ?? '').trim())
        .filter(Boolean);
    return [...new Set(candidates)];
}

function isExtensionMessageDeliveryError(error) {
    const message = error instanceof Error ? error.message : String(error ?? '');
    return /could not establish connection|receiving end does not exist|invalid extension id|chrome .*?환경/i.test(message);
}

function returnToSourceUrl(value) {
    const url = parseSourceUrl(value);
    if (url) {
        globalThis.location.replace(url);
        return true;
    }
    return false;
}

function parseSourceTabId(value) {
    if (typeof value !== 'string' || !/^\d+$/.test(value)) {
        return null;
    }
    const parsed = Number(value);
    return parsed > 0 ? parsed : null;
}

function parseSourceUrl(value) {
    if (typeof value !== 'string') {
        return null;
    }
    try {
        const url = new URL(value);
        if (url.protocol === 'http:' || url.protocol === 'https:') {
            return url.href;
        }
    }
    catch {
        // Ignore malformed redirect targets and leave the user on the connection result.
    }
    return null;
}
</script>
