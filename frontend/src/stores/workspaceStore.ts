import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  workspaceApi,
  type CreateQuestionPayload,
  type CreateReferencePayload,
  type EssayVersion,
  type VersionComparison,
  type WorkspaceDetail,
  type WorkspaceReference
} from '@/features/workspace/api/workspaceApi'

export const useWorkspaceStore = defineStore('workspace', () => {
  const status = ref<'idle' | 'loading' | 'ready' | 'saving' | 'error' | 'forbidden' | 'notFound'>('idle')
  const workspace = ref<WorkspaceDetail | null>(null)
  const versions = ref<EssayVersion[]>([])
  const versionComparison = ref<VersionComparison | null>(null)
  const activeReference = ref<WorkspaceReference | null>(null)
  const errorMessage = ref('')

  async function loadWorkspace(workspaceId: string) {
    status.value = 'loading'
    errorMessage.value = ''

    try {
      workspace.value = await workspaceApi.getWorkspace(workspaceId)
      versions.value = await workspaceApi.listVersions(workspaceId)
      versionComparison.value = null
      status.value = 'ready'
    } catch {
      workspace.value = null
      versions.value = []
      versionComparison.value = null
      activeReference.value = null
      status.value = 'error'
      errorMessage.value = '워크스페이스를 불러오지 못했습니다.'
    }
  }

  async function saveDraft(workspaceId: string, draftId: string, body: string) {
    status.value = 'saving'
    errorMessage.value = ''

    try {
      const savedQuestion = await workspaceApi.saveDraft(workspaceId, draftId, body)
      if (workspace.value) {
        workspace.value = {
          ...workspace.value,
          questions: workspace.value.questions.map((question) => (
            question.id === savedQuestion.id ? savedQuestion : question
          ))
        }
      }
      status.value = 'ready'
    } catch {
      status.value = 'error'
      errorMessage.value = '초안을 저장하지 못했습니다.'
    }
  }

  async function createQuestion(workspaceId: string, payload: CreateQuestionPayload) {
    status.value = 'saving'
    errorMessage.value = ''

    try {
      const question = await workspaceApi.createQuestion(workspaceId, payload)
      if (workspace.value) {
        workspace.value = {
          ...workspace.value,
          questions: [...workspace.value.questions, question]
        }
      }
      status.value = 'ready'
    } catch {
      status.value = 'error'
      errorMessage.value = '문항을 추가하지 못했습니다.'
    }
  }

  async function createVersion(workspaceId: string, questionId: string, versionName: string) {
    status.value = 'saving'
    errorMessage.value = ''

    try {
      const version = await workspaceApi.createVersion(workspaceId, questionId, versionName)
      versions.value = [version, ...versions.value]
      status.value = 'ready'
    } catch {
      status.value = 'error'
      errorMessage.value = '버전을 저장하지 못했습니다.'
    }
  }

  async function compareVersions(workspaceId: string, leftVersionId: string, rightVersionId: string) {
    status.value = 'loading'
    errorMessage.value = ''

    try {
      versionComparison.value = await workspaceApi.compareVersions(workspaceId, leftVersionId, rightVersionId)
      status.value = 'ready'
    } catch {
      status.value = 'error'
      errorMessage.value = '버전을 비교하지 못했습니다.'
    }
  }

  async function createReference(workspaceId: string, payload: CreateReferencePayload) {
    status.value = 'saving'
    errorMessage.value = ''

    try {
      const reference = await workspaceApi.createReference(workspaceId, payload)
      activeReference.value = reference
      if (workspace.value) {
        workspace.value = {
          ...workspace.value,
          references: [reference, ...workspace.value.references]
        }
      }
      status.value = 'ready'
    } catch {
      status.value = 'error'
      errorMessage.value = '참고자료를 저장하지 못했습니다.'
    }
  }

  async function openReference(referenceId: string) {
    status.value = 'loading'
    errorMessage.value = ''

    try {
      activeReference.value = await workspaceApi.getReference(referenceId)
      status.value = 'ready'
    } catch {
      status.value = 'error'
      errorMessage.value = '참고자료를 열지 못했습니다.'
    }
  }

  async function updateReference(referenceId: string, payload: CreateReferencePayload) {
    status.value = 'saving'
    errorMessage.value = ''

    try {
      const reference = await workspaceApi.updateReference(referenceId, payload)
      activeReference.value = reference
      if (workspace.value) {
        workspace.value = {
          ...workspace.value,
          references: workspace.value.references.map((item) => (
            item.id === reference.id ? reference : item
          ))
        }
      }
      status.value = 'ready'
    } catch {
      status.value = 'error'
      errorMessage.value = '참고자료를 수정하지 못했습니다.'
    }
  }

  async function deleteReference(referenceId: string) {
    status.value = 'saving'
    errorMessage.value = ''

    try {
      await workspaceApi.deleteReference(referenceId)
      if (workspace.value) {
        workspace.value = {
          ...workspace.value,
          references: workspace.value.references.filter((item) => item.id !== referenceId)
        }
      }
      if (activeReference.value?.id === referenceId) {
        activeReference.value = null
      }
      status.value = 'ready'
    } catch {
      status.value = 'error'
      errorMessage.value = '참고자료를 삭제하지 못했습니다.'
    }
  }

  return {
    status,
    workspace,
    versions,
    versionComparison,
    activeReference,
    errorMessage,
    loadWorkspace,
    saveDraft,
    createQuestion,
    createVersion,
    compareVersions,
    createReference,
    openReference,
    updateReference,
    deleteReference
  }
})
