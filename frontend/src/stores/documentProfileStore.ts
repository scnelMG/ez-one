import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  documentProfileApi,
  type DocumentProfile,
  type DocumentSectionPayload
} from '@/features/document-profile/api/documentProfileApi'

export interface BasicInfoSection {
  nameKo: string
  email: string
  phone: string
  address: string
}

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

  return { status, profile, errorMessage, basicInfo, loadDocumentProfile, saveBasicInfo }
})

function normalizeBasicInfo(payload: DocumentSectionPayload | undefined): BasicInfoSection {
  if (!payload) {
    return emptyBasicInfo
  }

  return {
    nameKo: stringValue(payload.nameKo),
    email: stringValue(payload.email),
    phone: stringValue(payload.phone),
    address: stringValue(payload.address)
  }
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : ''
}
