<template>
  <main class="auth-page">
    <section class="auth-panel" aria-labelledby="extension-connect-title">
      <img class="auth-logo" src="../assets/ez-one-logo-final.png" alt="EZ-ONE" />
      <p class="section-kicker">Chrome 확장 연결</p>
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
        ? '확장프로그램 연결이 완료되었습니다. 공고 페이지에서 팝업을 다시 열어 주세요.'
        : '로그인 세션을 확장프로그램에 연결하고 있습니다.';
});
onMounted(async () => {
    const extensionId = import.meta.env.VITE_EXTENSION_ID || DEFAULT_LOCAL_EXTENSION_ID;
    if (!extensionId) {
        errorMessage.value = '확장프로그램 ID가 설정되지 않았습니다. VITE_EXTENSION_ID를 설정해 주세요.';
        return;
    }
    if (!getAccessToken()) {
        errorMessage.value = '로그인 세션을 찾지 못했습니다. 다시 로그인해 주세요.';
        return;
    }
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
        const response = await sendExtensionMessage(extensionId, authMessage);
        if (!response?.accepted) {
            throw new Error(response?.message ?? '확장프로그램이 로그인 세션을 받지 못했습니다.');
        }
        completed.value = true;
        returnToSourceUrl(route.query.sourceUrl);
    }
    catch (error) {
        errorMessage.value = error instanceof Error ? error.message : '확장프로그램 연결에 실패했습니다.';
    }
});
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
function returnToSourceUrl(value) {
    if (typeof value !== 'string') {
        return;
    }
    try {
        const url = new URL(value);
        if (url.protocol === 'http:' || url.protocol === 'https:') {
            globalThis.location.replace(url.href);
        }
    }
    catch {
        // Ignore malformed redirect targets and leave the user on the connection result.
    }
}

function parseSourceTabId(value) {
    if (typeof value !== 'string' || !/^\d+$/.test(value)) {
        return null;
    }
    const parsed = Number(value);
    return parsed > 0 ? parsed : null;
}
</script>
