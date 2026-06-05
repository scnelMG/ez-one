import { defineStore } from 'pinia';
import { ref } from 'vue';
import { workspaceApi } from '@/features/workspace/api/workspaceApi';
import { messageFromError } from '@/shared/errorMessage';
export const useWorkspaceStore = defineStore('workspace', () => {
    const status = ref('idle');
    const workspace = ref(null);
    const defaults = ref(null);
    const versions = ref([]);
    const versionComparison = ref(null);
    const activeReference = ref(null);
    const errorMessage = ref('');
    async function loadWorkspace(workspaceId) {
        status.value = 'loading';
        errorMessage.value = '';
        try {
            workspace.value = await workspaceApi.getWorkspace(workspaceId);
            defaults.value = await workspaceApi.getDefaults(workspaceId);
            versions.value = await workspaceApi.listVersions(workspaceId);
            versionComparison.value = null;
            status.value = 'ready';
        }
        catch (error) {
            workspace.value = null;
            defaults.value = null;
            versions.value = [];
            versionComparison.value = null;
            activeReference.value = null;
            status.value = 'error';
            errorMessage.value = messageFromError(error, '워크스페이스를 불러오지 못했습니다.');
        }
    }
    async function saveDraft(workspaceId, draftId, body) {
        status.value = 'saving';
        errorMessage.value = '';
        try {
            const savedQuestion = await workspaceApi.saveDraft(workspaceId, draftId, body);
            if (workspace.value) {
                workspace.value = {
                    ...workspace.value,
                    questions: workspace.value.questions.map((question) => (question.id === savedQuestion.id ? savedQuestion : question))
                };
            }
            status.value = 'ready';
        }
        catch (error) {
            status.value = 'error';
            errorMessage.value = messageFromError(error, '초안을 저장하지 못했습니다.');
        }
    }
    async function createQuestion(workspaceId, payload) {
        status.value = 'saving';
        errorMessage.value = '';
        try {
            const question = await workspaceApi.createQuestion(workspaceId, payload);
            if (workspace.value) {
                workspace.value = {
                    ...workspace.value,
                    questions: [...workspace.value.questions, question]
                };
            }
            status.value = 'ready';
        }
        catch (error) {
            status.value = 'error';
            errorMessage.value = messageFromError(error, '문항을 추가하지 못했습니다.');
        }
    }
    async function updateQuestion(workspaceId, questionId, payload) {
        status.value = 'saving';
        errorMessage.value = '';
        try {
            const question = await workspaceApi.updateQuestion(workspaceId, questionId, payload);
            if (workspace.value) {
                workspace.value = {
                    ...workspace.value,
                    questions: workspace.value.questions.map((item) => (item.id === question.id ? question : item))
                };
            }
            status.value = 'ready';
        }
        catch (error) {
            status.value = 'error';
            errorMessage.value = messageFromError(error, '문항을 수정하지 못했습니다.');
        }
    }
    async function deleteQuestion(workspaceId, questionId) {
        status.value = 'saving';
        errorMessage.value = '';
        try {
            await workspaceApi.deleteQuestion(workspaceId, questionId);
            if (workspace.value) {
                workspace.value = {
                    ...workspace.value,
                    questions: workspace.value.questions.filter((item) => item.id !== questionId)
                };
            }
            versions.value = versions.value.filter((version) => version.questionId !== questionId);
            status.value = 'ready';
        }
        catch (error) {
            status.value = 'error';
            errorMessage.value = messageFromError(error, '문항을 삭제하지 못했습니다.');
        }
    }
    async function createVersion(workspaceId, questionId, versionName) {
        status.value = 'saving';
        errorMessage.value = '';
        try {
            const version = await workspaceApi.createVersion(workspaceId, questionId, versionName);
            versions.value = [version, ...versions.value];
            status.value = 'ready';
        }
        catch (error) {
            status.value = 'error';
            errorMessage.value = messageFromError(error, '버전을 저장하지 못했습니다.');
        }
    }
    async function compareVersions(workspaceId, leftVersionId, rightVersionId) {
        status.value = 'loading';
        errorMessage.value = '';
        try {
            versionComparison.value = await workspaceApi.compareVersions(workspaceId, leftVersionId, rightVersionId);
            status.value = 'ready';
        }
        catch (error) {
            status.value = 'error';
            errorMessage.value = messageFromError(error, '버전을 비교하지 못했습니다.');
        }
    }
    async function createReference(workspaceId, payload) {
        status.value = 'saving';
        errorMessage.value = '';
        try {
            const reference = await workspaceApi.createReference(workspaceId, payload);
            activeReference.value = reference;
            if (workspace.value) {
                workspace.value = {
                    ...workspace.value,
                    references: [reference, ...workspace.value.references]
                };
            }
            status.value = 'ready';
        }
        catch (error) {
            status.value = 'error';
            errorMessage.value = messageFromError(error, '참고자료를 저장하지 못했습니다.');
        }
    }
    async function openReference(referenceId) {
        status.value = 'loading';
        errorMessage.value = '';
        try {
            activeReference.value = await workspaceApi.getReference(referenceId);
            status.value = 'ready';
        }
        catch (error) {
            status.value = 'error';
            errorMessage.value = messageFromError(error, '참고자료를 열지 못했습니다.');
        }
    }
    async function updateReference(referenceId, payload) {
        status.value = 'saving';
        errorMessage.value = '';
        try {
            const reference = await workspaceApi.updateReference(referenceId, payload);
            activeReference.value = reference;
            if (workspace.value) {
                workspace.value = {
                    ...workspace.value,
                    references: workspace.value.references.map((item) => (item.id === reference.id ? reference : item))
                };
            }
            status.value = 'ready';
        }
        catch (error) {
            status.value = 'error';
            errorMessage.value = messageFromError(error, '참고자료를 수정하지 못했습니다.');
        }
    }
    async function deleteReference(referenceId) {
        status.value = 'saving';
        errorMessage.value = '';
        try {
            await workspaceApi.deleteReference(referenceId);
            if (workspace.value) {
                workspace.value = {
                    ...workspace.value,
                    references: workspace.value.references.filter((item) => item.id !== referenceId)
                };
            }
            if (activeReference.value?.id === referenceId) {
                activeReference.value = null;
            }
            status.value = 'ready';
        }
        catch (error) {
            status.value = 'error';
            errorMessage.value = messageFromError(error, '참고자료를 삭제하지 못했습니다.');
        }
    }
    return {
        status,
        workspace,
        defaults,
        versions,
        versionComparison,
        activeReference,
        errorMessage,
        loadWorkspace,
        saveDraft,
        createQuestion,
        updateQuestion,
        deleteQuestion,
        createVersion,
        compareVersions,
        createReference,
        openReference,
        updateReference,
        deleteReference
    };
});
