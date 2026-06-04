<template>
  <AppLayout>
    <section class="wire-page narrow">
      <PageHeader
        eyebrow="계정 설정"
        title="마이페이지"
        description="Google 계정으로 만든 기본 회원 정보를 확인하고 서비스에서 사용할 닉네임을 수정합니다."
      />

      <form class="form-shell" aria-label="마이페이지 기본 정보" @submit.prevent="saveProfile">
        <label>
          Google 계정 이름
          <input :value="currentUser?.name ?? ''" readonly />
        </label>
        <label>
          닉네임
          <input
            v-model="nickname"
            data-testid="nickname-input"
            maxlength="50"
            placeholder="서비스에서 사용할 이름"
          />
        </label>
        <label>
          이메일
          <input :value="currentUser?.email ?? ''" readonly />
        </label>
        <label>
          로그인 방식
          <input value="Google" readonly />
        </label>

        <div class="form-actions">
          <p v-if="statusMessage" class="form-status" role="status">{{ statusMessage }}</p>
          <button class="primary-button" type="submit" :disabled="saving">
            {{ saving ? '저장 중' : '저장' }}
          </button>
        </div>
      </form>
    </section>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { authApi } from '@/features/auth/api/authApi'
import { getCurrentUser, saveCurrentUser } from '@/features/auth/session/authSession'
import AppLayout from '@/shared/AppLayout.vue'
import PageHeader from '@/shared/PageHeader.vue'

const currentUser = ref(getCurrentUser())
const nickname = ref(currentUser.value?.nickname || currentUser.value?.name || '')
const saving = ref(false)
const statusMessage = ref('')

async function saveProfile() {
  const nextNickname = nickname.value.trim()

  if (!nextNickname) {
    statusMessage.value = '닉네임을 입력해 주세요.'
    return
  }

  saving.value = true
  statusMessage.value = ''

  try {
    const updatedUser = await authApi.updateCurrentUser({ nickname: nextNickname })
    currentUser.value = updatedUser
    nickname.value = updatedUser.nickname
    saveCurrentUser(updatedUser)
    statusMessage.value = '저장되었습니다.'
  } catch {
    statusMessage.value = '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'
  } finally {
    saving.value = false
  }
}
</script>
