<template>
  <AppLayout>
    <section class="wire-page document-wire">
      <header class="wire-toolbar">
        <div>
          <p class="section-kicker">PROFILE-001</p>
          <h1>서류 입력 정보</h1>
          <p>반복해서 쓰는 지원서 정보를 섹션별로 저장하고 워크스페이스 기본값으로 재사용합니다.</p>
        </div>
        <button
          class="primary-button"
          type="button"
          :disabled="documentProfileStore.status === 'saving'"
          @click="saveBasicInfo"
        >
          {{ saveButtonLabel }}
        </button>
      </header>

      <StatePanel
        v-if="documentProfileStore.status === 'error'"
        id="document-profile-error"
        tone="navy"
        title="서류 입력 정보 오류"
        :body="documentProfileStore.errorMessage"
      />

      <section class="workspace-tabs" aria-label="서류 정보 탭">
        <button
          v-for="section in sections"
          :key="section.id"
          class="tab-button"
          :class="{ active: section.id === activeSection }"
          type="button"
          @click="activeSection = section.id"
        >
          {{ section.label }}
        </button>
      </section>

      <div class="document-editor-grid">
        <aside class="wire-side-rail" aria-label="서류 섹션 목록">
          <strong>입력 섹션</strong>
          <button
            v-for="section in sections"
            :key="section.id"
            class="rail-button"
            :class="{ active: section.id === activeSection }"
            type="button"
            @click="activeSection = section.id"
          >
            {{ section.label }}
          </button>
        </aside>

        <main class="document-form-panel">
          <p v-if="documentProfileStore.status === 'loading'">서류 입력 정보를 불러오는 중입니다.</p>

          <template v-else>
            <div class="section-heading">
              <div>
                <p class="section-kicker">기본 정보</p>
                <h2>지원서 공통 입력값</h2>
              </div>
              <span class="status-chip">{{ statusLabel }}</span>
            </div>

            <section class="form-shell compact" aria-label="기본 정보 입력">
              <label>
                이름
                <input v-model="basicInfoForm.nameKo" data-testid="basic-info-name" />
              </label>
              <label>
                이메일
                <input v-model="basicInfoForm.email" data-testid="basic-info-email" />
              </label>
              <label>
                휴대폰
                <input v-model="basicInfoForm.phone" data-testid="basic-info-phone" />
              </label>
              <label>
                주소
                <input v-model="basicInfoForm.address" data-testid="basic-info-address" />
              </label>
            </section>
          </template>
        </main>

        <aside class="wire-side-panel">
          <p class="section-kicker">워크스페이스 기본값</p>
          <h2>저장된 정보 재사용</h2>
          <p>저장한 값은 워크스페이스의 자기소개서 기본값과 서류 정보 패널에서 다시 불러올 수 있습니다.</p>
          <div class="summary-stack">
            <ShellCard
              v-for="card in documentProfileCards"
              :key="card.title"
              :kicker="card.kicker"
              :title="card.title"
              :body="card.body"
              :status="card.status"
            />
          </div>
        </aside>
      </div>
    </section>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { documentProfileCards } from '@/data/shellContent'
import { useDocumentProfileStore, type BasicInfoSection } from '@/stores/documentProfileStore'
import AppLayout from '@/shared/AppLayout.vue'
import ShellCard from '@/shared/ShellCard.vue'
import StatePanel from '@/shared/StatePanel.vue'

const documentProfileStore = useDocumentProfileStore()
const activeSection = ref('basicInfo')
const basicInfoForm = reactive<BasicInfoSection>({
  nameKo: '',
  email: '',
  phone: '',
  address: ''
})
const sections = [
  { id: 'basicInfo', label: '기본 정보' },
  { id: 'education', label: '학력' },
  { id: 'career', label: '경력' },
  { id: 'projects', label: '프로젝트' },
  { id: 'certificates', label: '자격/어학' },
  { id: 'awards', label: '수상/활동' },
  { id: 'custom', label: '커스텀' }
]

const saveButtonLabel = computed(() => (
  documentProfileStore.status === 'saving' ? '저장 중' : '저장'
))
const statusLabel = computed(() => {
  if (documentProfileStore.status === 'saving') {
    return '저장 중'
  }

  return documentProfileStore.profile ? '불러옴' : '대기'
})

watch(
  () => documentProfileStore.basicInfo,
  (basicInfo) => {
    Object.assign(basicInfoForm, basicInfo)
  },
  { immediate: true }
)

onMounted(() => {
  void documentProfileStore.loadDocumentProfile()
})

function saveBasicInfo() {
  void documentProfileStore.saveBasicInfo({ ...basicInfoForm })
}
</script>
