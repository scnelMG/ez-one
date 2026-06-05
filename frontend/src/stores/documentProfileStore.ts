import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  documentProfileApi,
  type DocumentCustomFieldPayload,
  type DocumentProfile,
  type DocumentSectionPayload
} from '@/features/document-profile/api/documentProfileApi'

export interface BasicInfoSection {
  nameKo: string
  email: string
  phone: string
  address: string
}

export interface ReusableProfileItem {
  title: string
  summary: string
}

export type ReusableProfileSectionType =
  | 'education'
  | 'career'
  | 'courses'
  | 'projects'
  | 'certificates'
  | 'awards'
  | 'essays'
  | 'military'
  | 'internships'
  | 'trainings'
  | 'activities'

const emptyBasicInfo: BasicInfoSection = {
  nameKo: '',
  email: '',
  phone: '',
  address: ''
}

export const useDocumentProfileStore = defineStore('documentProfile', () => {
  const status = ref<'idle' | 'loading' | 'ready' | 'saving' | 'error'>('idle')
  const profile = ref<DocumentProfile | null>(null)
  const errorMessage = ref('')

  const basicInfo = computed<BasicInfoSection>(() => {
    return normalizeBasicInfo(profile.value?.sections.basicInfo)
  })
  const education = computed<ReusableProfileItem[]>(() => normalizeReusableItems(profile.value?.sections.education))
  const career = computed<ReusableProfileItem[]>(() => normalizeReusableItems(profile.value?.sections.career))
  const courses = computed<ReusableProfileItem[]>(() => normalizeReusableItems(profile.value?.sections.courses))
  const projects = computed<ReusableProfileItem[]>(() => normalizeReusableItems(profile.value?.sections.projects))
  const certificates = computed<ReusableProfileItem[]>(() => normalizeReusableItems(profile.value?.sections.certificates))
  const awards = computed<ReusableProfileItem[]>(() => normalizeReusableItems(profile.value?.sections.awards))
  const essays = computed<ReusableProfileItem[]>(() => normalizeReusableItems(profile.value?.sections.essays))
  const military = computed<ReusableProfileItem[]>(() => normalizeReusableItems(profile.value?.sections.military))
  const internships = computed<ReusableProfileItem[]>(() => normalizeReusableItems(profile.value?.sections.internships))
  const trainings = computed<ReusableProfileItem[]>(() => normalizeReusableItems(profile.value?.sections.trainings))
  const activities = computed<ReusableProfileItem[]>(() => normalizeReusableItems(profile.value?.sections.activities))

  async function loadDocumentProfile() {
    status.value = 'loading'
    errorMessage.value = ''

    try {
      profile.value = await documentProfileApi.getDocumentProfile()
      status.value = 'ready'
    } catch {
      status.value = 'error'
      profile.value = null
      errorMessage.value = '서류 입력 정보를 불러오지 못했습니다.'
    }
  }

  async function saveBasicInfo(payload: BasicInfoSection) {
    status.value = 'saving'
    errorMessage.value = ''

    try {
      profile.value = await documentProfileApi.saveSection('basicInfo', { ...payload })
      status.value = 'ready'
    } catch {
      status.value = 'error'
      errorMessage.value = '기본 정보를 저장하지 못했습니다.'
    }
  }

  async function saveReusableSection(sectionType: ReusableProfileSectionType, payload: ReusableProfileItem[]) {
    status.value = 'saving'
    errorMessage.value = ''

    try {
      profile.value = await documentProfileApi.saveSection(sectionType, payload)
      status.value = 'ready'
    } catch {
      status.value = 'error'
      errorMessage.value = '서류 섹션을 저장하지 못했습니다.'
    }
  }

  async function createCustomField(payload: DocumentCustomFieldPayload) {
    status.value = 'saving'
    errorMessage.value = ''

    try {
      const field = await documentProfileApi.createCustomField(payload)
      if (profile.value) {
        profile.value = {
          ...profile.value,
          customFields: [...profile.value.customFields, field]
        }
      }
      status.value = 'ready'
    } catch {
      status.value = 'error'
      errorMessage.value = '커스텀 항목을 추가하지 못했습니다.'
    }
  }

  async function updateCustomField(fieldId: string, payload: DocumentCustomFieldPayload) {
    status.value = 'saving'
    errorMessage.value = ''

    try {
      const field = await documentProfileApi.updateCustomField(fieldId, payload)
      if (profile.value) {
        profile.value = {
          ...profile.value,
          customFields: profile.value.customFields.map((item) => (item.id === fieldId ? field : item))
        }
      }
      status.value = 'ready'
    } catch {
      status.value = 'error'
      errorMessage.value = '커스텀 항목을 수정하지 못했습니다.'
    }
  }

  async function deleteCustomField(fieldId: string) {
    status.value = 'saving'
    errorMessage.value = ''

    try {
      await documentProfileApi.deleteCustomField(fieldId)
      if (profile.value) {
        profile.value = {
          ...profile.value,
          customFields: profile.value.customFields.filter((item) => item.id !== fieldId)
        }
      }
      status.value = 'ready'
    } catch {
      status.value = 'error'
      errorMessage.value = '커스텀 항목을 삭제하지 못했습니다.'
    }
  }

  return {
    status,
    profile,
    errorMessage,
    basicInfo,
    education,
    career,
    courses,
    projects,
    certificates,
    awards,
    essays,
    military,
    internships,
    trainings,
    activities,
    loadDocumentProfile,
    saveBasicInfo,
    saveReusableSection,
    createCustomField,
    updateCustomField,
    deleteCustomField
  }
})

function normalizeBasicInfo(payload: DocumentSectionPayload | undefined): BasicInfoSection {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return emptyBasicInfo
  }
  const record = payload as Record<string, unknown>

  return {
    nameKo: stringValue(record.nameKo),
    email: stringValue(record.email),
    phone: stringValue(record.phone),
    address: stringValue(record.address)
  }
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function normalizeReusableItems(payload: DocumentSectionPayload | undefined): ReusableProfileItem[] {
  if (!Array.isArray(payload)) {
    return []
  }

  return payload.map((item) => {
    const record = typeof item === 'object' && item !== null ? item as Record<string, unknown> : {}
    return {
      title: stringValue(record.title),
      summary: stringValue(record.summary)
    }
  })
}
