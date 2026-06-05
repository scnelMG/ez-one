import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  notionApi,
  type NotionConnection,
  type NotionSyncLog
} from '@/features/notion/api/notionApi'

export const useNotionStore = defineStore('notion', () => {
  const status = ref<'idle' | 'loading' | 'ready' | 'saving' | 'error'>('idle')
  const connection = ref<NotionConnection | null>(null)
  const syncLogs = ref<NotionSyncLog[]>([])
  const errorMessage = ref('')

  async function loadNotionSettings() {
    status.value = 'loading'
    errorMessage.value = ''

    try {
      const [loadedConnection, loadedLogs] = await Promise.all([
        notionApi.getConnection(),
        notionApi.listSyncLogs()
      ])
      connection.value = loadedConnection
      syncLogs.value = loadedLogs
      status.value = 'ready'
    } catch {
      connection.value = null
      syncLogs.value = []
      status.value = 'error'
      errorMessage.value = 'Notion 설정을 불러오지 못했습니다.'
    }
  }

  async function updateJobOnlySync(syncEnabled: boolean) {
    status.value = 'saving'
    errorMessage.value = ''

    try {
      connection.value = await notionApi.updateSyncSettings(syncEnabled)
      status.value = 'ready'
    } catch {
      status.value = 'error'
      errorMessage.value = 'Notion 동기화 설정을 저장하지 못했습니다.'
    }
  }

  async function connectNotion() {
    status.value = 'saving'
    errorMessage.value = ''

    try {
      connection.value = await notionApi.connect()
      syncLogs.value = await notionApi.listSyncLogs()
      status.value = 'ready'
    } catch {
      status.value = 'error'
      errorMessage.value = 'Notion 계정을 연결하지 못했습니다.'
    }
  }

  return { status, connection, syncLogs, errorMessage, loadNotionSettings, connectNotion, updateJobOnlySync }
})
