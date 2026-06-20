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
        async compareVersions(workspaceId, leftVersionId, rightVersionId, customPrompt) {
            try {
                const payload = {
                    leftVersionId: Number(leftVersionId),
                    rightVersionId: Number(rightVersionId)
                };
                if (customPrompt?.trim()) {
                    payload.customPrompt = customPrompt.trim();
                }
                const response = await httpClient.post(`/api/workspaces/${workspaceId}/versions/compare`, payload);
                return toVersionComparison(unwrapApiData(response.data));
            }
            catch {
                const versions = mockVersionList(workspaceId);
                const left = versions.find((version) => version.id === String(leftVersionId));
                const right = versions.find((version) => version.id === String(rightVersionId));
                if (!left || !right) {
                    return {
                        leftVersionId: String(leftVersionId),
                        rightVersionId: String(rightVersionId),
                        leftBody: left ? left.body : '불러올 수 없음',
                        rightBody: right ? right.body : '불러올 수 없음',
                        changed: true,
                        aiSummary: '백엔드 AI 요약 요청 실패. (로컬/네트워크 환경을 확인해주세요)'
                    };
                }
                const changed = left.body !== right.body;
                return {
                    leftVersionId: left.id,
                    rightVersionId: right.id,
                    leftBody: left.body,
                    rightBody: right.body,
                    changed: changed,
                    aiSummary: changed ? `[테스트 요약] 변경된 내용은 다음과 같습니다.\n${customPrompt || ''}` : '변경된 내용이 없습니다.'
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
        async listDartDisclosures(workspaceId) {
            const response = await httpClient.get(`/api/workspaces/${workspaceId}/dart/disclosures`);
            const data = unwrapApiData(response.data);
            return {
                available: data.available,
                message: data.message,
                disclosures: (data.disclosures ?? []).map(toDartDisclosure)
            };
        },
        async createDartAnalysis(workspaceId, payload) {
            const response = await httpClient.post(`/api/workspaces/${workspaceId}/dart/analyses`, payload);
            return toDartAnalysis(unwrapApiData(response.data));
        },
        async getDartAnalysis(workspaceId, analysisId) {
            const response = await httpClient.get(`/api/workspaces/${workspaceId}/dart/analyses/${analysisId}`);
            return toDartAnalysis(unwrapApiData(response.data));
        },
        async saveDartAnalysisReference(workspaceId, analysisId) {
            const response = await httpClient.post(`/api/workspaces/${workspaceId}/dart/analyses/${analysisId}/save-reference`, {});
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
        body: version.body,
        createdAt: version.createdAt
    };
}
function toVersionComparison(data) {
    return {
        leftVersionId: String(data.leftVersionId),
        rightVersionId: String(data.rightVersionId),
        leftBody: data.leftBody ?? '',
        rightBody: data.rightBody ?? '',
        changed: data.changed ?? false,
        aiSummary: data.aiSummary ?? (data.changed ? 'AI 요약을 불러오지 못했습니다.' : '두 버전의 내용이 동일합니다. 변경된 내용이 없습니다.')
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
function toDartDisclosure(disclosure) {
    return {
        rceptNo: disclosure.rceptNo,
        reportName: disclosure.reportName,
        reportType: disclosure.reportType,
        receivedDate: disclosure.receivedDate,
        corpName: disclosure.corpName,
        recommended: Boolean(disclosure.recommended),
        sourceUrl: disclosure.sourceUrl
    };
}
function toDartAnalysis(analysis) {
    return {
        id: String(analysis.id),
        workspaceId: String(analysis.workspaceId),
        rceptNo: analysis.rceptNo,
        reportName: analysis.reportName,
        companyName: analysis.companyName,
        status: analysis.status,
        model: analysis.model,
        sourceUrl: analysis.sourceUrl,
        result: analysis.result ?? {
            evidenceCards: [],
            appealPoints: [],
            suggestedSentences: [],
            cautions: [],
            missingInfo: []
        },
        errorMessage: analysis.errorMessage
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
