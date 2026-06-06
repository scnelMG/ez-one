import { defaultHttpClient, unwrapApiData } from '@/shared/apiClient';
import { mockWorkspaces } from './mockWorkspaceData';
export function createWorkspaceApi(httpClient = defaultHttpClient) {
    return {
        async getWorkspace(workspaceId) {
            try {
                const response = await httpClient.get(`/api/workspaces/${workspaceId}`);
                const data = unwrapApiData(response.data);
                return {
                    id: String(data.id),
                    companyName: data.companyName,
                    positionTitle: data.positionTitle,
                    deadlineLabel: data.deadlineLabel,
                    statusLabel: data.statusLabel,
                    sourceUrl: data.sourceUrl,
                    companyDetails: data.companyDetails,
                    questions: data.questions.map(toWorkspaceQuestion),
                    references: data.references.map(toWorkspaceReference)
                };
            }
            catch {
                const mockWorkspace = mockWorkspaces[workspaceId];
                if (!mockWorkspace) {
                    throw new Error('Workspace not found');
                }
                return mockWorkspace;
            }
        },
        async getDefaults(workspaceId) {
            const response = await httpClient.get(`/api/workspaces/${workspaceId}/defaults`);
            const data = unwrapApiData(response.data);
            return {
                workspaceId: String(data.workspaceId),
                sections: data.sections
            };
        },
        async saveDraft(workspaceId, draftId, body) {
            const response = await httpClient.patch(`/api/workspaces/${workspaceId}/drafts/${draftId}`, { body });
            return toWorkspaceQuestion(unwrapApiData(response.data));
        },
        async createQuestion(workspaceId, payload) {
            const response = await httpClient.post(`/api/workspaces/${workspaceId}/questions`, payload);
            return toWorkspaceQuestion(unwrapApiData(response.data));
        },
        async updateQuestion(workspaceId, questionId, payload) {
            const response = await httpClient.patch(`/api/workspaces/${workspaceId}/questions/${questionId}`, payload);
            return toWorkspaceQuestion(unwrapApiData(response.data));
        },
        async deleteQuestion(workspaceId, questionId) {
            if (!httpClient.delete) {
                throw new Error('HTTP delete is not configured');
            }
            await httpClient.delete(`/api/workspaces/${workspaceId}/questions/${questionId}`);
        },
        async createVersion(workspaceId, questionId, versionName) {
            const response = await httpClient.post(`/api/workspaces/${workspaceId}/versions`, {
                questionId: Number(questionId),
                versionName
            });
            return toEssayVersion(unwrapApiData(response.data));
        },
        async listVersions(workspaceId) {
            const response = await httpClient.get(`/api/workspaces/${workspaceId}/versions`);
            return unwrapApiData(response.data).map(toEssayVersion);
        },
        async compareVersions(workspaceId, leftVersionId, rightVersionId) {
            const response = await httpClient.post(`/api/workspaces/${workspaceId}/versions/compare`, {
                leftVersionId: Number(leftVersionId),
                rightVersionId: Number(rightVersionId)
            });
            return toVersionComparison(unwrapApiData(response.data));
        },
        async createReference(workspaceId, payload) {
            const response = await httpClient.post(`/api/workspaces/${workspaceId}/references`, payload);
            return toWorkspaceReference(unwrapApiData(response.data));
        },
        async getReference(referenceId) {
            const response = await httpClient.get(`/api/references/${referenceId}`);
            return toWorkspaceReference(unwrapApiData(response.data));
        },
        async updateReference(referenceId, payload) {
            const response = await httpClient.patch(`/api/references/${referenceId}`, payload);
            return toWorkspaceReference(unwrapApiData(response.data));
        },
        async deleteReference(referenceId) {
            if (!httpClient.delete) {
                throw new Error('HTTP delete is not configured');
            }
            await httpClient.delete(`/api/references/${referenceId}`);
        }
    };
}
function toWorkspaceQuestion(question) {
    return {
        id: String(question.id),
        prompt: question.prompt,
        draft: question.draft,
        maxLength: question.maxLength
    };
}
function toEssayVersion(version) {
    return {
        id: String(version.id),
        questionId: String(version.questionId),
        versionName: version.versionName,
        body: version.body
    };
}
function toVersionComparison(comparison) {
    return {
        leftVersionId: String(comparison.leftVersionId),
        rightVersionId: String(comparison.rightVersionId),
        leftBody: comparison.leftBody,
        rightBody: comparison.rightBody,
        changed: comparison.changed
    };
}
function toWorkspaceReference(reference) {
    return {
        id: String(reference.id),
        boardName: reference.boardName,
        type: reference.referenceType,
        title: reference.title,
        body: reference.body,
        url: reference.url
    };
}
function readConfig(httpClient) {
    return httpClient === defaultHttpClient ? { skipAuthRefresh: true } : {};
}
export const workspaceApi = createWorkspaceApi();

