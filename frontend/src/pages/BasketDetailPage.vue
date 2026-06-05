<template>
  <AppLayout>
    <section class="basket-page">
      <header class="basket-hero">
        <div>
          <p class="section-kicker">JOB-006 · JOB-007</p>
          <h1>공고 상세</h1>
          <p>저장한 공고의 기본 정보를 확인하고 수정합니다.</p>
        </div>
        <RouterLink class="ghost-button" to="/basket">목록</RouterLink>
      </header>

      <StatePanel
        v-if="basketStore.status === 'error'"
        id="basket-detail-error"
        tone="navy"
        title="공고 상세 오류"
        :body="basketStore.errorMessage"
      />

      <p v-else-if="basketStore.status === 'loading'" class="basket-loading">공고 상세를 불러오는 중입니다.</p>

      <section v-else class="deadline-panel" aria-label="공고 상세 수정">
        <div class="section-heading">
          <div>
            <p class="section-kicker">저장 공고</p>
            <h2>{{ basketStore.activeJob?.companyName ?? '공고 정보' }}</h2>
          </div>
          <RouterLink
            v-if="basketStore.activeJob"
            class="primary-button"
            :to="`/workspaces/${basketStore.activeJob.workspaceId}`"
          >
            워크스페이스
          </RouterLink>
        </div>

        <form class="manual-job-form" data-testid="detail-form" @submit.prevent="saveJob">
          <label>
            회사명
            <input v-model="form.companyName" data-testid="detail-company" required />
          </label>
          <label>
            직무명
            <input v-model="form.positionTitle" data-testid="detail-position" required />
          </label>
          <label>
            마감일
            <input v-model="form.deadlineLabel" data-testid="detail-deadline" />
          </label>
          <label>
            공고 URL
            <input v-model="form.sourceUrl" data-testid="detail-source" required />
          </label>
          <label>
            지원 메모
            <textarea v-model="form.applicationMemo" data-testid="detail-memo" />
          </label>
          <button class="primary-button" type="submit">공고 수정</button>
        </form>
      </section>
    </section>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppLayout from '@/shared/AppLayout.vue'
import StatePanel from '@/shared/StatePanel.vue'
import { useBasketStore } from '@/stores/basketStore'

const route = useRoute()
const basketStore = useBasketStore()
const basketJobId = computed(() => String(route.params.basketJobId ?? ''))
const form = reactive({
  companyName: '',
  positionTitle: '',
  deadlineLabel: '',
  sourceUrl: '',
  applicationMemo: ''
})

watch(
  () => basketStore.activeJob,
  (job) => {
    form.companyName = job?.companyName ?? ''
    form.positionTitle = job?.positionTitle ?? ''
    form.deadlineLabel = job?.deadlineLabel ?? ''
    form.sourceUrl = job?.sourceUrl ?? ''
    form.applicationMemo = job?.applicationMemo ?? ''
  },
  { immediate: true }
)

function loadJob() {
  if (!basketJobId.value) {
    return
  }

  void basketStore.loadJob(basketJobId.value)
}

function saveJob() {
  if (!basketJobId.value) {
    return
  }

  void basketStore.updateJob(basketJobId.value, {
    companyName: form.companyName,
    positionTitle: form.positionTitle,
    deadlineLabel: form.deadlineLabel,
    sourceUrl: form.sourceUrl,
    applicationMemo: form.applicationMemo
  })
}

onMounted(loadJob)
watch(basketJobId, loadJob)
</script>
