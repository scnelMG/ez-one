<template>
  <main class="auth-page">
    <section class="auth-panel" aria-labelledby="extension-connect-title">
      <img class="auth-logo" src="../assets/ez-one-logo-final.png" alt="EZ-ONE" />
      <h1 id="extension-connect-title">확장프로그램 연결</h1>
      <p>{{ statusMessage }}</p>
      <p v-if="hasError" class="extension-connect-help" data-testid="extension-connect-help">
        스토어에서 설치한 뒤 지원 중인 채용공고 페이지에서 EZ-ONE을 다시 열어 주세요.
        그래도 안 되면 확장 프로그램을 새로고침하고 다시 로그인해 주세요.
      </p>
      <div v-if="hasError" class="extension-connect-actions">
        <RouterLink class="primary-button" to="/login">다시 로그인하기</RouterLink>
        <a
          v-if="extensionInstallUrl"
          class="secondary-button"
          data-testid="extension-install-link"
          :href="extensionInstallUrl"
          target="_blank"
          rel="noreferrer"
        >
          설치 페이지 열기
        </a>
      </div>
      <RouterLink v-else class="primary-button" to="/main">EZ-ONE 열기</RouterLink>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { authApi } from '@/features/auth/api/authApi';
import { getAccessToken } from '@/features/auth/session/authSession';

const DEFAULT_LOCAL_EXTENSION_ID = import.meta.env.DEV ? 'ikpeibohnopmikegoogggmdipmhmiadi' : '';
const SUPPORTED_SOURCE_HOST = 'jasoseol.com';
const route = useRoute();
const errorMessage = ref('');
const completed = ref(false);
const hasError = computed(() => Boolean(errorMessage.value));
const extensionInstallUrl = computed(() => String(import.meta.env.VITE_EXTENSION_INSTALL_URL ?? '').trim());
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
        errorMessage.value = '확장프로그램 연결 설정이 완료되지 않았습니다. 잠시 후 다시 시도해 주세요.';
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
    if (/chrome .*?환경|could not establish connection|receiving end does not exist|invalid extension id/i.test(message)) {
        return 'Chrome 확장프로그램에서 연결을 시작해야 합니다.';
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
    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }
    if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
        try {
            const url = new URL(trimmed, globalThis.location?.origin ?? 'https://ez-one.o-r.kr');
            return `${url.pathname}${url.search}${url.hash}`;
        }
        catch {
            return null;
        }
    }
    try {
        const url = new URL(trimmed);
        if ((url.protocol === 'http:' || url.protocol === 'https:') && isSupportedSourceHost(url.hostname)) {
            return url.href;
        }
    }
    catch {
        // Ignore malformed redirect targets and leave the user on the connection result.
    }
    return null;
}

function isSupportedSourceHost(hostname) {
    const normalizedHostname = hostname.toLowerCase();
    return normalizedHostname === SUPPORTED_SOURCE_HOST ||
        normalizedHostname.endsWith(`.${SUPPORTED_SOURCE_HOST}`);
}
</script>

<style scoped>
.extension-connect-help {
  color: var(--muted);
  line-height: 1.6;
  margin: 0;
}

.extension-connect-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
}

.secondary-button {
  align-items: center;
  border: 1px solid var(--line-strong);
  border-radius: 6px;
  color: var(--text);
  display: inline-flex;
  font-weight: 800;
  justify-content: center;
  min-height: 42px;
  padding: 0 18px;
  text-decoration: none;
}
</style>
