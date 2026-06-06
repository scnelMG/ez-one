<template>
  <AppLayout>
    <section class="wire-page onboarding-wire">
      <div class="modal-scrim">
        <section class="onboarding-dialog" aria-label="온보딩 입력 모달">
          <div class="dialog-header">
            <div>
              <p class="section-kicker">ONB-001</p>
              <h1>선호 조건을 알려주세요</h1>
              <p>추천 공고와 메인 대시보드에 사용할 기본 선호 정보를 저장합니다.</p>
            </div>
            <span class="status-chip">{{ statusLabel }}</span>
          </div>

          <StatePanel
            v-if="profileStore.status === 'error'"
            id="onboarding-error"
            tone="navy"
            title="온보딩 오류"
            :body="profileStore.errorMessage"
          />

          <section class="tag-section" aria-label="선호 직무">
            <strong>선호 직무</strong>
            <div class="tag-list">
              <button
                v-for="role in roleOptions"
                :key="role"
                class="filter-chip"
                :class="{ active: form.desiredRoles.includes(role) }"
                type="button"
                @click="toggleListValue(form.desiredRoles, role)"
              >
                {{ role }}
              </button>
            </div>
          </section>

          <section class="tag-section" aria-label="선호 기업 유형">
            <strong>선호 기업 유형</strong>
            <div class="tag-list">
              <button
                v-for="companyType in companyTypeOptions"
                :key="companyType"
                class="filter-chip"
                :class="{ active: form.companyTypes.includes(companyType) }"
                type="button"
                @click="toggleListValue(form.companyTypes, companyType)"
              >
                {{ companyType }}
              </button>
            </div>
          </section>

          <section class="tag-section" aria-label="기술 스택">
            <strong>기술 스택</strong>
            <div class="tag-list">
              <button
                v-for="skill in skillOptions"
                :key="skill"
                class="filter-chip"
                :class="{ active: form.skills.includes(skill) }"
                type="button"
                @click="toggleListValue(form.skills, skill)"
              >
                {{ skill }}
              </button>
            </div>
          </section>

          <section class="form-shell compact" aria-label="추가 선호 정보">
            <label>
              근무 지역
              <input v-model="regionInput" data-testid="onboarding-region" autocomplete="address-level1" />
            </label>
            <label>
              관심 산업
              <input v-model="industryInput" data-testid="onboarding-industry" autocomplete="organization-title" />
            </label>
            <label>
              SSAFY 여부
              <select v-model="form.ssafy" data-testid="onboarding-ssafy">
                <option :value="false">아니오</option>
                <option :value="true">예</option>
              </select>
            </label>
          </section>

          <div class="dialog-actions">
            <button class="ghost-button" type="button" data-testid="skip-onboarding" @click="skipOnboarding">건너뛰기</button>
            <button
              class="primary-button"
              type="button"
              :disabled="profileStore.status === 'saving'"
              data-testid="save-onboarding"
              @click="saveOnboarding"
            >
              {{ saveButtonLabel }}
            </button>
          </div>
        </section>
      </div>
    </section>
  </AppLayout>
</template>

<script setup>
import AppLayout from '@/shared/AppLayout.vue';
import StatePanel from '@/shared/StatePanel.vue';
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useProfileStore } from '@/stores/profileStore';

const router = useRouter();
const profileStore = useProfileStore();
const form = reactive({
    desiredRoles: ['백엔드 개발자'],
    companyTypes: ['스타트업'],
    skills: ['Java', 'Spring Boot'],
    ssafy: false
});
const regionInput = ref('서울');
const industryInput = ref('커머스');
const roleOptions = ['백엔드 개발자', '서버 개발자', '플랫폼 엔지니어'];
const companyTypeOptions = ['대기업', '스타트업', '공공기관'];
const skillOptions = ['Java', 'Spring Boot', 'MyBatis', 'MySQL'];
const statusLabel = computed(() => {
    if (profileStore.status === 'saving') {
        return '저장 중';
    }
    return profileStore.profile?.completed ? '저장됨' : '첫 로그인';
});
const saveButtonLabel = computed(() => (profileStore.status === 'saving' ? '저장 중' : '저장하고 시작'));

onMounted(() => {
    void profileStore.loadProfile();
});

function toggleListValue(values, value) {
    const index = values.indexOf(value);
    if (index >= 0) {
        values.splice(index, 1);
        return;
    }
    values.push(value);
}

async function saveOnboarding() {
    await profileStore.saveProfile({
        desiredRoles: form.desiredRoles,
        companyTypes: form.companyTypes,
        industries: splitCsv(industryInput.value),
        regions: splitCsv(regionInput.value),
        skills: form.skills,
        ssafy: form.ssafy
    });
    if (profileStore.status === 'ready') {
        await router.push('/');
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
        await router.push('/');
    }
}

function splitCsv(value) {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
}
</script>
