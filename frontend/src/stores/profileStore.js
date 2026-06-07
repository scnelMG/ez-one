import { defineStore } from 'pinia';
import { ref } from 'vue';
import { getCurrentUser, saveCurrentUser } from '@/features/auth/session/authSession';
import { profileApi } from '@/features/profile/api/profileApi';
import { messageFromError } from '@/shared/errorMessage';
export const useProfileStore = defineStore('profile', () => {
    const status = ref('idle');
    const profile = ref(null);
    const errorMessage = ref('');
    async function loadProfile() {
        status.value = 'loading';
        errorMessage.value = '';
        try {
            profile.value = await profileApi.getUserProfile();
            status.value = 'ready';
        }
        catch (error) {
            status.value = 'error';
            profile.value = null;
            errorMessage.value = messageFromError(error, '온보딩 정보를 불러오지 못했습니다.');
        }
    }
    async function saveProfile(payload) {
        status.value = 'saving';
        errorMessage.value = '';
        try {
            profile.value = await profileApi.saveUserProfile(payload);
            const currentUser = getCurrentUser();
            if (currentUser) {
                saveCurrentUser({ ...currentUser, profileCompleted: profile.value.completed, onboardingRequired: false });
            }
            status.value = 'ready';
        }
        catch (error) {
            status.value = 'error';
            errorMessage.value = messageFromError(error, '온보딩 정보를 저장하지 못했습니다.');
        }
    }
    return { status, profile, errorMessage, loadProfile, saveProfile };
});
