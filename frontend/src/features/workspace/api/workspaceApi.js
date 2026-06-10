import { defaultHttpClient, unwrapApiData } from '@/shared/apiClient';
import { mockWorkspaces } from './mockWorkspaceData';

const mockVersionsByWorkspace = new Map();
let mockQuestionId = 9000;
let mockVersionId = 9500;
let mockReferenceId = 9700;

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
                return cloneWorkspace(mockWorkspace);
            }
        },
        async getDefaults(workspaceId) {
            try {
                const response = await httpClient.get(`/api/workspaces/${workspaceId}/defaults`);
                const data = unwrapApiData(response.data);
                return {
                    workspaceId: String(data.workspaceId),
                    sections: data.sections
                };
            }
            catch {
                if (!mockWorkspaces[workspaceId]) {
                    throw new Error('Workspace defaults not found');
                }
                return {
                    workspaceId: String(workspaceId),
                    sections: {
                        basicInfo: { nameKo: '', email: '' },
                        projects: [],
                        awards: []
                    }
                };
            }
        },
        async saveDraft(workspaceId, draftId, body) {
            try {
                const response = await httpClient.patch(`/api/workspaces/${workspaceId}/drafts/${draftId}`, { body });
                return toWorkspaceQuestion(unwrapApiData(response.data));
            }
            catch {
                const question = findMockQuestion(workspaceId, draftId);
                question.draft = body;
                return { ...question };
            }
        },
        async createQuestion(workspaceId, payload) {
            try {
                const response = await httpClient.post(`/api/workspaces/${workspaceId}/questions`, payload);
                return toWorkspaceQuestion(unwrapApiData(response.data));
            }
            catch {
                const workspace = requireMockWorkspace(workspaceId);
                const question = {
                    id: String(mockQuestionId += 1),
                    prompt: payload.prompt,
                    draft: '',
                    maxLength: payload.maxLength
                };
                workspace.questions.push(question);
                return { ...question };
            }
        },
        async updateQuestion(workspaceId, questionId, payload) {
            try {
                const response = await httpClient.patch(`/api/workspaces/${workspaceId}/questions/${questionId}`, payload);
                return toWorkspaceQuestion(unwrapApiData(response.data));
            }
            catch {
                const question = findMockQuestion(workspaceId, questionId);
                question.prompt = payload.prompt;
                question.maxLength = payload.maxLength;
                return { ...question };
            }
        },
        async deleteQuestion(workspaceId, questionId) {
            try {
                if (!httpClient.delete) {
                    throw new Error('HTTP delete is not configured');
                }
                await httpClient.delete(`/api/workspaces/${workspaceId}/questions/${questionId}`);
            }
            catch {
                const workspace = requireMockWorkspace(workspaceId);
                workspace.questions = workspace.questions.filter((question) => question.id !== String(questionId));
            }
        },
        async createVersion(workspaceId, questionId, versionName, body = null) {
            try {
                const payload = {
                    questionId: Number(questionId),
                    versionName
                };
                if (body !== null) {
                    payload.body = body;
                }
                const response = await httpClient.post(`/api/workspaces/${workspaceId}/versions`, {
                    ...payload
                });
                return toEssayVersion(unwrapApiData(response.data));
            }
            catch {
                const question = findMockQuestion(workspaceId, questionId);
                const version = {
                    id: String(mockVersionId += 1),
                    questionId: String(questionId),
                    versionName,
                    body: body ?? question.draft,
                    createdAt: new Date().toLocaleString('ko-KR')
                };
                mockVersionList(workspaceId).unshift(version);
                return { ...version };
            }
        },
        async listVersions(workspaceId) {
            try {
                const response = await httpClient.get(`/api/workspaces/${workspaceId}/versions`);
                return unwrapApiData(response.data).map(toEssayVersion);
            }
            catch {
                requireMockWorkspace(workspaceId);
                return mockVersionList(workspaceId).map((version) => ({ ...version }));
            }
        },
        async compareVersions(workspaceId, leftVersionId, rightVersionId) {
            try {
                const response = await httpClient.post(`/api/workspaces/${workspaceId}/versions/compare`, {
                    leftVersionId: Number(leftVersionId),
                    rightVersionId: Number(rightVersionId)
                });
                return toVersionComparison(unwrapApiData(response.data));
            }
            catch {
                const versions = mockVersionList(workspaceId);
                const left = versions.find((version) => version.id === String(leftVersionId));
                const right = versions.find((version) => version.id === String(rightVersionId));
                if (!left || !right) {
                    throw new Error('Version not found');
                }
                return {
                    leftVersionId: left.id,
                    rightVersionId: right.id,
                    leftBody: left.body,
                    rightBody: right.body,
                    changed: left.body !== right.body
                };
            }
        },
        async createReference(workspaceId, payload) {
            try {
                const response = await httpClient.post(`/api/workspaces/${workspaceId}/references`, payload);
                return toWorkspaceReference(unwrapApiData(response.data));
            }
            catch {
                const workspace = requireMockWorkspace(workspaceId);
                const reference = {
                    id: String(mockReferenceId += 1),
                    boardName: payload.boardName,
                    type: payload.referenceType,
                    title: payload.title,
                    body: payload.body,
                    url: payload.url
                };
                workspace.references.unshift(reference);
                return { ...reference };
            }
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
        body: version.body,
        createdAt: version.createdAt
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

function cloneWorkspace(workspace) {
    return {
        ...workspace,
        companyDetails: { ...workspace.companyDetails },
        questions: workspace.questions.map((question) => ({ ...question })),
        references: workspace.references.map((reference) => ({ ...reference }))
    };
}

function requireMockWorkspace(workspaceId) {
    const workspace = mockWorkspaces[workspaceId];
    if (!workspace) {
        throw new Error('Workspace not found');
    }
    return workspace;
}

function findMockQuestion(workspaceId, questionId) {
    const workspace = requireMockWorkspace(workspaceId);
    const question = workspace.questions.find((item) => item.id === String(questionId));
    if (!question) {
        throw new Error('Question not found');
    }
    return question;
}

function mockVersionList(workspaceId) {
    if (!mockVersionsByWorkspace.has(String(workspaceId))) {
        requireMockWorkspace(workspaceId);
        mockVersionsByWorkspace.set(String(workspaceId), []);
    }
    return mockVersionsByWorkspace.get(String(workspaceId));
}
