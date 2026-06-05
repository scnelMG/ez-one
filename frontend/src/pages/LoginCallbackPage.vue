<template>
  <main class="auth-page">
    <section class="auth-panel" aria-labelledby="callback-title">
      <img class="auth-logo" src="../assets/ez-one-logo.svg" alt="EZ One" />
      <p class="section-kicker">Google 로그인</p>
      <h1 id="callback-title">Google 로그인 처리 중</h1>
      <p>{{ statusMessage }}</p>
      <RouterLink v-if="hasError" class="primary-button" to="/">다시 로그인하기</RouterLink>
    </section>
  </main>
</template>

<script setup>import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { authApi } from '@/features/auth/api/authApi';
import { consumeOAuthState, getGoogleRedirectUri } from '@/features/auth/oauth/googleOAuth';
import { saveAuthSession } from '@/features/auth/session/authSession';
const route = useRoute();
const router = useRouter();
const errorMessage = ref('');
const hasError = computed(() => Boolean(errorMessage.value));
const statusMessage = computed(() => errorMessage.value || 'Google 계정 확인이 끝나면 EZ One 작업 공간으로 이동합니다.');
onMounted(async () => {
    const code = typeof route.query.code === 'string' ? route.query.code : '';
    const state = typeof route.query.state === 'string' ? route.query.state : '';
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
        await router.replace(authSession.user.profileCompleted ? redirectPath : '/onboarding');
    }
    catch (error) {
        errorMessage.value = error instanceof Error ? error.message : 'Google 로그인 처리에 실패했습니다.';
    }
});
</script>
