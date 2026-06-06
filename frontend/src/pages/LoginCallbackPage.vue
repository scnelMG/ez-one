<template>
  <main class="auth-page">
    <section class="auth-panel" aria-labelledby="callback-title">
      <img class="auth-logo" src="../assets/ez-one-logo.svg" alt="EZ-ONE" />
      <p class="section-kicker">Google 로그인</p>
      <h1 id="callback-title">Google 로그인을 처리하고 있습니다</h1>
      <p>{{ statusMessage }}</p>
      <RouterLink v-if="hasError" class="primary-button" to="/login">다시 로그인하기</RouterLink>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { authApi } from '@/features/auth/api/authApi';
import { consumeOAuthState, getGoogleRedirectUri } from '@/features/auth/oauth/googleOAuth';
import { saveAuthSession } from '@/features/auth/session/authSession';

const route = useRoute();
const router = useRouter();
const errorMessage = ref('');
const hasError = computed(() => Boolean(errorMessage.value));
const statusMessage = computed(() => errorMessage.value || 'Google 계정 확인이 끝나면 EZ-ONE 작업 공간으로 이동합니다.');

onMounted(async () => {
    const code = typeof route.query.code === 'string' ? route.query.code : '';
    const state = typeof route.query.state === 'string' ? route.query.state : '';
    const oauthError = typeof route.query.error === 'string' ? route.query.error : '';
    if (oauthError) {
        errorMessage.value = oauthError === 'access_denied'
            ? 'Google 로그인이 취소되었거나 승인되지 않았습니다. 다시 로그인해 주세요.'
            : 'Google 로그인 과정에서 오류가 발생했습니다. 다시 로그인해 주세요.';
        return;
    }
    if (!code || !state) {
        errorMessage.value = 'Google 로그인 응답이 올바르지 않습니다. 다시 로그인해 주세요.';
        return;
    }
    try {
        const redirectPath = consumeOAuthState(state);
        const authSession = await authApi.loginWithGoogle({
            authorizationCode: code,
            redirectUri: getGoogleRedirectUri()
        });
        saveAuthSession(authSession);
        await router.replace(authSession.user.profileCompleted ? redirectPath : '/');
    }
    catch (error) {
        errorMessage.value = error instanceof Error ? error.message : 'Google 로그인 처리에 실패했습니다.';
    }
});
</script>
