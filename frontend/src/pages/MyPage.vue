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

      <form
        class="form-shell"
        data-testid="profile-preferences-form"
        aria-label="마이페이지 온보딩 정보"
        @submit.prevent="savePreferences"
      >
        <label>
          희망 직무
          <input v-model="profileForm.desiredRoles" data-testid="profile-desired-roles" />
        </label>
        <label>
          희망 기업 분류
          <input v-model="profileForm.companyTypes" data-testid="profile-company-types" />
        </label>
        <label>
          계열/업종
          <input v-model="profileForm.industries" data-testid="profile-industries" />
        </label>
        <label>
          희망 근무 지역
          <input v-model="profileForm.regions" data-testid="profile-regions" />
        </label>
        <label>
          보유 스킬
          <input v-model="profileForm.skills" data-testid="profile-skills" />
        </label>
        <label>
          SSAFY 여부
          <select v-model="profileForm.ssafy" data-testid="profile-ssafy">
            <option value="false">아니오</option>
            <option value="true">예</option>
          </select>
        </label>

        <div class="form-actions">
          <p v-if="preferenceStatusMessage" class="form-status" role="status">{{ preferenceStatusMessage }}</p>
          <button class="primary-button" type="submit" :disabled="profileStore.status === 'saving'">
            {{ profileStore.status === 'saving' ? '저장 중' : '선호 정보 저장' }}
          </button>
        </div>
      </form>
    </section>
  </AppLayout>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { authApi } from '@/features/auth/api/authApi'
import { getCurrentUser, saveCurrentUser } from '@/features/auth/session/authSession'
import { useProfileStore } from '@/stores/profileStore'
import AppLayout from '@/shared/AppLayout.vue'
import PageHeader from '@/shared/PageHeader.vue'

const profileStore = useProfileStore()
const currentUser = ref(getCurrentUser())
const nickname = ref(currentUser.value?.nickname || currentUser.value?.name || '')
const saving = ref(false)
const statusMessage = ref('')
const preferenceStatusMessage = ref('')
const profileForm = reactive({
  desiredRoles: '',
  companyTypes: '',
  industries: '',
  regions: '',
  skills: '',
  ssafy: 'false'
})

onMounted(async () => {
  await profileStore.loadProfile()

  if (profileStore.profile) {
    syncProfileForm()
  }
})

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

async function savePreferences() {
  await profileStore.saveProfile({
    desiredRoles: splitCsv(profileForm.desiredRoles),
    companyTypes: splitCsv(profileForm.companyTypes),
    industries: splitCsv(profileForm.industries),
    regions: splitCsv(profileForm.regions),
    skills: splitCsv(profileForm.skills),
    ssafy: profileForm.ssafy === 'true'
  })

  if (profileStore.status === 'ready' && profileStore.profile) {
    syncProfileForm()
    preferenceStatusMessage.value = '선호 정보가 저장되었습니다.'
    return
  }

  preferenceStatusMessage.value = profileStore.errorMessage || '선호 정보를 저장하지 못했습니다.'
}

function syncProfileForm() {
  const profile = profileStore.profile

  if (!profile) {
    return
  }

  profileForm.desiredRoles = profile.desiredRoles.join(', ')
  profileForm.companyTypes = profile.companyTypes.join(', ')
  profileForm.industries = profile.industries.join(', ')
  profileForm.regions = profile.regions.join(', ')
  profileForm.skills = profile.skills.join(', ')
  profileForm.ssafy = String(profile.ssafy)
}

function splitCsv(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean)
}
</script>
