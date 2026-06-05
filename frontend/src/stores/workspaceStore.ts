import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  workspaceApi,
  type EssayVersion,
  type WorkspaceDetail
} from '@/features/workspace/api/workspaceApi'

export const useWorkspaceStore = defineStore('workspace', () => {
  const status = ref<'idle' | 'loading' | 'ready' | 'saving' | 'error' | 'forbidden' | 'notFound'>('idle')
  const workspace = ref<WorkspaceDetail | null>(null)
  const versions = ref<EssayVersion[]>([])
  const errorMessage = ref('')

  async function loadWorkspace(workspaceId: string) {
    status.value = 'loading'
    errorMessage.value = ''

    try {
      workspace.value = await workspaceApi.getWorkspace(workspaceId)
      versions.value = await workspaceApi.listVersions(workspaceId)
      status.value = 'ready'
    } catch {
      workspace.value = null
      versions.value = []
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

  return { status, workspace, versions, errorMessage, loadWorkspace, saveDraft, createVersion }
})
