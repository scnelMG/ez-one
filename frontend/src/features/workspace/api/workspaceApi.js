import { defaultHttpClient, unwrapApiData } from '@/shared/apiClient';

export function createWorkspaceApi(httpClient = defaultHttpClient) {
    return {
        async getWorkspace(workspaceId) {
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
        async createVersion(workspaceId, questionId, versionName, body = null) {
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
        },
        async listVersions(workspaceId) {
            const response = await httpClient.get(`/api/workspaces/${workspaceId}/versions`);
            return unwrapApiData(response.data).map(toEssayVersion);
        },
        async compareVersions(workspaceId, leftVersionId, rightVersionId) {
            const payload = {
                leftVersionId: Number(leftVersionId),
                rightVersionId: Number(rightVersionId)
            };
            const response = await httpClient.post(`/api/workspaces/${workspaceId}/versions/compare`, payload);
            return toVersionComparison(unwrapApiData(response.data));
        },
        async createReference(workspaceId, payload) {
            const response = await httpClient.post(`/api/workspaces/${workspaceId}/references`, payload);
            return toWorkspaceReference(unwrapApiData(response.data));
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
        leftVersionName: data.leftVersionName ?? '',
        rightVersionName: data.rightVersionName ?? '',
        questionPrompt: data.questionPrompt ?? '',
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
    const result = analysis.result ?? {};
    return {
        id: String(analysis.id),
        workspaceId: String(analysis.workspaceId),
        rceptNo: analysis.rceptNo,
        reportName: analysis.reportName,
        companyName: analysis.companyName,
        status: analysis.status,
        model: analysis.model,
        sourceUrl: analysis.sourceUrl,
        result: {
            evidenceCards: result.evidenceCards ?? [],
            appealPoints: result.appealPoints ?? [],
            suggestedSentences: result.suggestedSentences ?? [],
            cautions: result.cautions ?? [],
            missingInfo: result.missingInfo ?? [],
            mainProductsAndServices: result.mainProductsAndServices ?? null,
            contractsAndRAndD: result.contractsAndRAndD ?? null,
            otherNotes: result.otherNotes ?? null
        },
        errorMessage: analysis.errorMessage
    };
}
function readConfig(httpClient) {
    return httpClient === defaultHttpClient ? { skipAuthRefresh: true } : {};
}
export const workspaceApi = createWorkspaceApi();
