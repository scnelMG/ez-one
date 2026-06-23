<template>
  <div class="preference-form">
    <section class="preference-section preference-section-wide onboarding-field-group" aria-label="관심 직무군">
      <div class="preference-section-head">
        <strong>관심 직무군</strong>
        <p>관심 있는 직무군을 모두 선택하세요.</p>
      </div>
      <div class="onboarding-chip-list">
        <button
          v-for="roleGroup in roleGroupOptions"
          :key="roleGroup"
          class="filter-chip preference-chip"
          :class="{ active: listValue('desiredRoles').includes(roleGroup) }"
          type="button"
          :data-testid="`${testPrefix}-role-group-option-${roleGroup}`"
          @click="toggleRoleGroup(roleGroup)"
        >
          {{ roleGroup }}
        </button>
      </div>
    </section>

    <section v-if="visibleRoleDetails.length" class="preference-section preference-section-wide onboarding-field-group" aria-label="세부 포지션">
      <div class="preference-section-head">
        <strong>세부 포지션</strong>
        <p>선택한 직무군 안에서 더 보고 싶은 포지션</p>
      </div>
      <div class="onboarding-chip-list">
        <button
          v-for="roleDetail in visibleRoleDetails"
          :key="roleDetail"
          class="filter-chip preference-chip"
          :class="{ active: listValue('desiredRoles').includes(roleDetail) }"
          type="button"
          :data-testid="`${testPrefix}-role-detail-option-${roleDetail}`"
          @click="toggleRoleDetail(roleDetail)"
        >
          {{ roleDetail }}
        </button>
      </div>
    </section>

    <section class="preference-section onboarding-field-group" aria-label="희망 기업 유형">
      <div class="preference-section-head">
        <strong>희망 기업 유형</strong>
        <p>관심 있는 조직 규모와 형태</p>
      </div>
      <div class="onboarding-chip-list">
        <button
          v-for="companyType in companyTypeOptions"
          :key="companyType"
          class="filter-chip preference-chip"
          :class="{ active: listValue('companyTypes').includes(companyType) }"
          type="button"
          :data-testid="`${testPrefix}-company-option-${companyType}`"
          @click="toggleListValue('companyTypes', companyType)"
        >
          {{ companyType }}
        </button>
      </div>
    </section>

    <section class="preference-section onboarding-field-group" aria-label="계열 및 업종">
      <div class="preference-section-head">
        <strong>계열 / 업종</strong>
        <p>추천 공고를 좁히는 산업 기준</p>
      </div>
      <div class="onboarding-chip-list">
        <button
          v-for="industry in industryOptions"
          :key="industry"
          class="filter-chip preference-chip"
          :class="{ active: listValue('industries').includes(industry) }"
          type="button"
          :data-testid="`${testPrefix}-industry-option-${industry}`"
          @click="toggleListValue('industries', industry)"
        >
          {{ industry }}
        </button>
      </div>
    </section>

    <section class="preference-section onboarding-field-group" aria-label="희망 근무 지역">
      <div class="preference-section-head">
        <strong>희망 근무 지역</strong>
        <p>출퇴근 또는 원격 선호</p>
      </div>
      <div class="onboarding-chip-list">
        <button
          v-for="region in regionOptions"
          :key="region"
          class="filter-chip preference-chip"
          :class="{ active: listValue('regions').includes(region) }"
          type="button"
          :data-testid="`${testPrefix}-region-option-${region}`"
          @click="toggleListValue('regions', region)"
        >
          {{ region }}
        </button>
      </div>
    </section>

    <section class="preference-section preference-section-wide onboarding-field-group" aria-label="보유 기술">
      <div class="preference-section-head">
        <strong>기술 / 키워드</strong>
        <p>추천 기준에 사용할 기술을 선택하거나 직접 입력하세요.</p>
      </div>
      <div class="onboarding-chip-list preference-skill-suggestions">
        <button
          v-for="skill in skillSuggestionOptions"
          :key="skill"
          class="filter-chip preference-chip"
          :class="{ active: listValue('skills').includes(skill) }"
          type="button"
          :data-testid="`${testPrefix}-skill-suggestion-${skill}`"
          @click="toggleSkillSuggestion(skill)"
        >
          {{ skill }}
        </button>
      </div>
      <div class="skill-input-shell">
        <span v-for="skill in listValue('skills')" :key="skill" class="skill-token">
          {{ skill }}
          <button
            type="button"
            :aria-label="`${skill} 삭제`"
            :data-testid="`${testPrefix}-skill-remove-${skill}`"
            @click="removeSkill(skill)"
          >
            ×
          </button>
        </span>
        <input
          v-model="skillInput"
          :data-testid="`${testPrefix}-skill-input`"
          type="text"
          placeholder="React, Java, Spring 입력 후 Enter"
          @keyup.enter="addSkill"
        />
      </div>
    </section>

    <section class="preference-section preference-section-wide onboarding-field-group" aria-label="SSAFY 교육생 여부">
      <div class="preference-section-head">
        <strong>SSAFY 교육생 여부</strong>
        <p>SSAFY 전용 공고와 추천 기준에 사용됩니다.</p>
      </div>
      <div class="segmented-control preference-segmented">
        <button
          type="button"
          :class="{ active: form.ssafy }"
          :data-testid="`${testPrefix}-ssafy-true`"
          @click="form.ssafy = true"
        >
          예
        </button>
        <button
          type="button"
          :class="{ active: !form.ssafy }"
          :data-testid="`${testPrefix}-ssafy-false`"
          @click="form.ssafy = false"
        >
          아니오
        </button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import {
  companyTypeOptions,
  industryOptions,
  regionOptions,
  roleDetailOptionsByGroup,
  roleGroupOptions,
  skillSuggestionOptions,
  undecidedRoleOption
} from '@/features/profile/profileOptions';

const props = defineProps({
  form: {
    type: Object,
    required: true
  },
  testPrefix: {
    type: String,
    default: 'profile'
  }
});

const skillInput = ref('');

const selectedRoleGroups = computed(() =>
  roleGroupOptions.filter((roleGroup) =>
    roleGroup !== undecidedRoleOption && listValue('desiredRoles').includes(roleGroup)
  )
);

const inferredRoleGroups = computed(() =>
  roleGroupOptions.filter((roleGroup) =>
    roleGroup !== undecidedRoleOption &&
    (roleDetailOptionsByGroup[roleGroup] ?? []).some((roleDetail) => listValue('desiredRoles').includes(roleDetail))
  )
);

const visibleRoleDetails = computed(() => {
  const groups = selectedRoleGroups.value.length > 0 ? selectedRoleGroups.value : inferredRoleGroups.value;
  return [
    ...new Set(groups.flatMap((roleGroup) => roleDetailOptionsByGroup[roleGroup] ?? []))
  ];
});

function listValue(key) {
  if (!Array.isArray(props.form[key])) {
    props.form[key] = [];
  }
  return props.form[key];
}

function toggleListValue(key, value) {
  const values = listValue(key);
  const index = values.indexOf(value);
  if (index >= 0) {
    values.splice(index, 1);
    return;
  }
  values.push(value);
}

function toggleRoleGroup(roleGroup) {
  const values = listValue('desiredRoles');
  if (roleGroup === undecidedRoleOption) {
    values.splice(0, values.length);
    values.push(undecidedRoleOption);
    return;
  }

  const roleGroupIndex = values.indexOf(roleGroup);
  if (roleGroupIndex >= 0) {
    values.splice(roleGroupIndex, 1);
    for (const detail of roleDetailOptionsByGroup[roleGroup] ?? []) {
      const detailIndex = values.indexOf(detail);
      if (detailIndex >= 0) {
        values.splice(detailIndex, 1);
      }
    }
    return;
  }

  const undecidedIndex = values.indexOf(undecidedRoleOption);
  if (undecidedIndex >= 0) {
    values.splice(undecidedIndex, 1);
  }
  values.push(roleGroup);
}

function toggleRoleDetail(roleDetail) {
  const values = listValue('desiredRoles');
  const undecidedIndex = values.indexOf(undecidedRoleOption);
  if (undecidedIndex >= 0) {
    values.splice(undecidedIndex, 1);
  }
  toggleListValue('desiredRoles', roleDetail);
}

function toggleSkillSuggestion(skill) {
  toggleListValue('skills', skill);
}

function addSkill() {
  const nextSkill = skillInput.value.trim();
  const skills = listValue('skills');
  if (nextSkill && !skills.includes(nextSkill)) {
    skills.push(nextSkill);
  }
  skillInput.value = '';
}

function removeSkill(skill) {
  const skills = listValue('skills');
  const index = skills.indexOf(skill);
  if (index >= 0) {
    skills.splice(index, 1);
  }
}
</script>
