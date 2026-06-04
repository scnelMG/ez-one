import { defineStore } from 'pinia'
import { ref } from 'vue'
import { workspaceApi, type WorkspaceDetail } from '@/features/workspace/api/workspaceApi'

export const useWorkspaceStore = defineStore('workspace', () => {
  const status = ref<'idle' | 'loading' | 'ready' | 'error' | 'forbidden' | 'notFound'>('idle')
  const workspace = ref<WorkspaceDetail | null>(null)
  const errorMessage = ref('')

  async function loadWorkspace(workspaceId: string) {
    status.value = 'loading'
    errorMessage.value = ''

    try {
      workspace.value = await workspaceApi.getWorkspace(workspaceId)
      status.value = 'ready'
    } catch {
      workspace.value = null
      status.value = 'error'
      errorMessage.value = '워크스페이스를 불러오지 못했습니다.'
    }
  }

  return { status, workspace, errorMessage, loadWorkspace }
})
