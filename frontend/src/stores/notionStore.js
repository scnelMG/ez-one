import { defineStore } from 'pinia';
import { ref } from 'vue';
import { notionApi } from '@/features/notion/api/notionApi';
import { messageFromError } from '@/shared/errorMessage';
export const useNotionStore = defineStore('notion', () => {
    const status = ref('idle');
    const connection = ref(null);
    const syncLogs = ref([]);
    const errorMessage = ref('');
    async function loadNotionSettings() {
        status.value = 'loading';
        errorMessage.value = '';
        try {
            const [loadedConnection, loadedLogs] = await Promise.all([
                notionApi.getConnection(),
                notionApi.listSyncLogs()
            ]);
            connection.value = loadedConnection;
            syncLogs.value = loadedLogs;
            if (loadedConnection.connected && loadedConnection.syncEnabled) {
                connection.value = await notionApi.syncNow();
                syncLogs.value = await notionApi.listSyncLogs();
            }
            status.value = 'ready';
        }
        catch (error) {
            connection.value = null;
            syncLogs.value = [];
            status.value = 'error';
            errorMessage.value = messageFromError(error, 'Notion 설정을 불러오지 못했습니다.');
        }
    }
    async function updateJobOnlySync(syncEnabled) {
        status.value = 'saving';
        errorMessage.value = '';
        try {
            connection.value = await notionApi.updateSyncSettings(syncEnabled);
            if (connection.value.connected && connection.value.syncEnabled) {
                connection.value = await notionApi.syncNow();
                syncLogs.value = await notionApi.listSyncLogs();
            }
            status.value = 'ready';
        }
        catch (error) {
            status.value = 'error';
            errorMessage.value = messageFromError(error, 'Notion 동기화 설정을 저장하지 못했습니다.');
        }
    }
    async function connectNotion(oauthResult) {
        status.value = 'saving';
        errorMessage.value = '';
        try {
            connection.value = await notionApi.connect(oauthResult);
            syncLogs.value = await notionApi.listSyncLogs();
            status.value = 'ready';
        }
        catch (error) {
            status.value = 'error';
            errorMessage.value = messageFromError(error, 'Notion 계정을 연결하지 못했습니다.');
        }
    }
    async function getNotionOAuthUrl(oauthRequest) {
        return notionApi.getOAuthUrl(oauthRequest);
    }
    async function disconnectNotion() {
        status.value = 'saving';
        errorMessage.value = '';
        try {
            await notionApi.disconnect();
            connection.value = { connected: false, syncEnabled: false, syncScope: 'JOB_ONLY', accountName: '' };
            status.value = 'ready';
        }
        catch (error) {
            status.value = 'error';
            errorMessage.value = messageFromError(error, 'Notion 연결을 해제하지 못했습니다.');
        }
    }
    return { status, connection, syncLogs, errorMessage, loadNotionSettings, connectNotion, disconnectNotion, updateJobOnlySync, getNotionOAuthUrl };
});
