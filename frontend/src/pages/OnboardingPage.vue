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
          <h2 id="onboarding-title">맞춤 공고 추천 정보 입력</h2>
          <p>입력한 정보로 나에게 맞는 공고를 추천해드려요.</p>
        </div>
        <button class="icon-button" type="button" aria-label="온보딩 닫기" @click="skipOnboarding">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </header>

      <div class="onboarding-modal-body">
        <StatePanel
          v-if="profileStore.status === 'error'"
          id="onboarding-error"
          tone="navy"
          title="온보딩 오류"
          :body="profileStore.errorMessage"
        />

        <section class="onboarding-field-group" aria-label="희망 직무">
          <strong>희망 직무</strong>
          <div class="onboarding-chip-list">
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

        <section class="onboarding-field-group" aria-label="희망 기업 유형">
          <strong>희망 기업 유형</strong>
          <div class="onboarding-chip-list">
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

        <section class="onboarding-field-group" aria-label="계열 및 업종">
          <strong>계열 / 업종</strong>
          <div class="onboarding-chip-list">
            <button
              v-for="industry in industryOptions"
              :key="industry"
              class="filter-chip"
              :class="{ active: form.industries.includes(industry) }"
              type="button"
              @click="toggleListValue(form.industries, industry)"
            >
              {{ industry }}
            </button>
          </div>
        </section>

        <section class="onboarding-field-group" aria-label="희망 근무 지역">
          <strong>희망 근무 지역</strong>
          <div class="onboarding-chip-list">
            <button
              v-for="region in regionOptions"
              :key="region"
              class="filter-chip"
              :class="{ active: form.regions.includes(region) }"
              type="button"
              @click="toggleListValue(form.regions, region)"
            >
              {{ region }}
            </button>
          </div>
        </section>

        <section class="onboarding-field-group" aria-label="보유 스킬">
          <strong>보유 스킬</strong>
          <div class="skill-input-shell">
            <span v-for="skill in form.skills" :key="skill" class="skill-token">
              {{ skill }}
              <button type="button" :aria-label="`${skill} 삭제`" @click="removeSkill(skill)">
                <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </span>
            <input
              v-model="skillInput"
              data-testid="onboarding-skill-input"
              type="text"
              placeholder="React, Java, Spring 입력 후 Enter"
              @keyup.enter="addSkill"
            />
          </div>
        </section>

        <section class="onboarding-field-group" aria-label="SSAFY 교육생 여부">
          <strong>SSAFY 교육생이신가요?</strong>
          <div class="segmented-control">
            <button type="button" :class="{ active: form.ssafy }" @click="form.ssafy = true">예</button>
            <button type="button" :class="{ active: !form.ssafy }" @click="form.ssafy = false">아니오</button>
          </div>
          <p class="onboarding-helper">'예' 선택 시 Mattermost 추천 공고가 함께 표시돼요.</p>
        </section>
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
import StatePanel from '@/shared/StatePanel.vue';
import { onMounted, reactive, ref } from 'vue';
import { useProfileStore } from '@/stores/profileStore';

const emit = defineEmits(['completed']);
const profileStore = useProfileStore();
const roleOptions = ['프론트엔드', '백엔드', '데이터 엔지니어', 'AI/ML', '모바일', 'DevOps', 'PM', '디자인', 'QA', '기타'];
const companyTypeOptions = ['대기업', '공공기관', '중견기업', '중소기업', '스타트업', '기타'];
const industryOptions = ['IT/플랫폼', '제조', '금융', '커머스', '게임', '바이오/헬스', '미디어', '기타'];
const regionOptions = ['서울', '경기', '인천', '대전', '부산', '대구', '광주', '제주', '원격(재택)'];
const form = reactive({
    desiredRoles: [roleOptions[0]],
    companyTypes: [companyTypeOptions[0]],
    industries: [industryOptions[0]],
    regions: [regionOptions[0]],
    skills: [],
    ssafy: true
});
const skillInput = ref('');

onMounted(async () => {
    await profileStore.loadProfile();
    if (profileStore.profile) {
        const profile = profileStore.profile;
        form.desiredRoles = selectedOrDefault(profile.desiredRoles, roleOptions);
        form.companyTypes = selectedOrDefault(profile.companyTypes, companyTypeOptions);
        form.industries = selectedOrDefault(profile.industries, industryOptions);
        form.regions = selectedOrDefault(profile.regions, regionOptions);
        form.skills = [...(profile.skills ?? [])];
        form.ssafy = profile.ssafy ?? false;
    }
});

function selectedOrDefault(values, options) {
    return Array.isArray(values) && values.length > 0 ? [...values] : [options[0]];
}

function toggleListValue(values, value) {
    const index = values.indexOf(value);
    if (index >= 0) {
        values.splice(index, 1);
        return;
    }
    values.push(value);
}

function addSkill() {
    const nextSkill = skillInput.value.trim();
    if (nextSkill && !form.skills.includes(nextSkill)) {
        form.skills.push(nextSkill);
    }
    skillInput.value = '';
}

function removeSkill(skill) {
    const index = form.skills.indexOf(skill);
    if (index >= 0) {
        form.skills.splice(index, 1);
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
        emit('completed');
    }
}
</script>
