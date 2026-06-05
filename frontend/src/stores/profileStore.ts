import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getCurrentUser, saveCurrentUser } from '@/features/auth/session/authSession'
import {
  profileApi,
  type UserProfile,
  type UserProfileRequest
} from '@/features/profile/api/profileApi'

export const useProfileStore = defineStore('profile', () => {
  const status = ref<'idle' | 'loading' | 'ready' | 'saving' | 'error'>('idle')
  const profile = ref<UserProfile | null>(null)
  const errorMessage = ref('')

  async function loadProfile() {
    status.value = 'loading'
    errorMessage.value = ''

    try {
      profile.value = await profileApi.getUserProfile()
      status.value = 'ready'
    } catch {
      status.value = 'error'
      profile.value = null
      errorMessage.value = '온보딩 정보를 불러오지 못했습니다.'
    }
  }

  async function saveProfile(payload: UserProfileRequest) {
    status.value = 'saving'
    errorMessage.value = ''

    try {
      profile.value = await profileApi.saveUserProfile(payload)
      const currentUser = getCurrentUser()

      if (currentUser) {
        saveCurrentUser({ ...currentUser, profileCompleted: profile.value.completed })
      }

      status.value = 'ready'
    } catch {
      status.value = 'error'
      errorMessage.value = '온보딩 정보를 저장하지 못했습니다.'
    }
  }

  return { status, profile, errorMessage, loadProfile, saveProfile }
})
