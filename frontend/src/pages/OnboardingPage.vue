<template>
  <div class="onboarding-modal-backdrop" role="presentation">
    <section
      class="onboarding-dialog"
      data-testid="onboarding-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <header class="onboarding-modal-header">
        <div>
          <h2 id="onboarding-title">지원 준비 정보 입력</h2>
          <p>입력한 정보는 마이페이지에서 언제든 다시 수정할 수 있어요.</p>
        </div>
        <button class="icon-button" type="button" aria-label="온보딩 닫기" @click="skipOnboarding">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </header>

      <div class="onboarding-modal-body">
        <p v-if="profileLoadNotice" id="onboarding-error" class="onboarding-soft-notice" role="status">
          {{ profileLoadNotice }}
        </p>

        <PreferenceForm :form="form" test-prefix="onboarding" />
      </div>

      <footer class="onboarding-modal-actions">
        <span>나중에 마이페이지에서 수정할 수 있어요</span>
        <div>
          <button class="ghost-button" type="button" data-testid="skip-onboarding" @click="skipOnboarding">건너뛰기</button>
          <button
            class="primary-button"
            type="button"
            :disabled="profileStore.status === 'saving'"
            data-testid="save-onboarding"
            @click="saveOnboarding"
          >
            {{ profileStore.status === 'saving' ? '저장 중' : '시작하기' }}
          </button>
        </div>
      </footer>
    </section>
  </div>
</template>

<script setup>
import PreferenceForm from '@/features/profile/components/PreferenceForm.vue';
import { onMounted, reactive, ref } from 'vue';
import { useProfileStore } from '@/stores/profileStore';
import { useBasketStore } from '@/stores/basketStore';

const emit = defineEmits(['completed']);
const profileStore = useProfileStore();
const basketStore = useBasketStore();
const profileLoadNotice = ref('');
const form = reactive({
    desiredRoles: [],
    companyTypes: [],
    industries: [],
    regions: [],
    skills: [],
    ssafy: false
});

onMounted(async () => {
    await profileStore.loadProfile();
    if (profileStore.profile) {
        const profile = profileStore.profile;
        form.desiredRoles = copyList(profile.desiredRoles);
        form.companyTypes = copyList(profile.companyTypes);
        form.industries = copyList(profile.industries);
        form.regions = copyList(profile.regions);
        form.skills = [...(profile.skills ?? [])];
        form.ssafy = profile.ssafy ?? false;
        return;
    }
    if (profileStore.status === 'error') {
        profileLoadNotice.value = '저장된 온보딩 정보를 불러오지 못해 새 정보로 시작합니다. 저장하면 최신 정보로 다시 반영됩니다.';
    }
});

function copyList(values) {
    return Array.isArray(values) ? [...values] : [];
}

async function seedDummyJobs() {
    try {
        await basketStore.createJob({
            companyName: '네이버',
            positionTitle: 'Backend Engineer',
            deadlineLabel: '2026.06.30',
            sourceUrl: 'https://recruit.navercorp.com/',
            savedSource: 'MANUAL'
        });
        await basketStore.createJob({
            companyName: '카카오페이',
            positionTitle: 'Server Developer',
            deadlineLabel: 'D-5',
            sourceUrl: 'https://careers.kakao.com/jobs/S-4714',
            savedSource: 'MANUAL'
        });
        await basketStore.createJob({
            companyName: '당근',
            positionTitle: 'Product Engineer',
            deadlineLabel: 'D-9',
            sourceUrl: 'https://about.daangn.com/jobs/software-engineer-backend/',
            savedSource: 'MANUAL'
        });
    } catch (e) {
        console.error('Failed to seed dummy jobs', e);
    }
}

async function saveOnboarding() {
    await profileStore.saveProfile({
        desiredRoles: form.desiredRoles,
        companyTypes: form.companyTypes,
        industries: form.industries,
        regions: form.regions,
        skills: form.skills,
        ssafy: form.ssafy
    });
    if (profileStore.status === 'ready') {
        await seedDummyJobs();
        emit('completed');
    }
}

async function skipOnboarding() {
    await profileStore.saveProfile({
        desiredRoles: [],
        companyTypes: [],
        industries: [],
        regions: [],
        skills: [],
        ssafy: false
    });
    if (profileStore.status === 'ready') {
        await seedDummyJobs();
        emit('completed');
    }
}
</script>
