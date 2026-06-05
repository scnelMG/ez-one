import { describe, expect, it, vi } from 'vitest';
import { createWorkspaceApi } from './workspaceApi';
describe('workspaceApi', () => {
    it('WS-027/WS-028: maps company details and workspace document defaults', async () => {
        const get = vi.fn()
            .mockResolvedValueOnce({
            data: {
                success: true,
                data: {
                    id: 102,
                    basketJobId: 101,
                    companyName: 'Naver',
                    positionTitle: 'Backend Engineer',
                    deadlineLabel: 'D-3',
                    statusLabel: '진행 중',
                    sourceUrl: 'https://www.jasoseol.com/',
                    companyDetails: {
                        domain: 'naver.com',
                        companyType: '대기업',
                        size: '1,000명 이상',
                        rating: 4.2,
                        startingSalary: 5000,
                        financialStatus: 'stable'
                    },
                    questions: [],
                    references: []
                },
                error: null
            }
        })
            .mockResolvedValueOnce({
            data: {
                success: true,
                data: {
                    workspaceId: 102,
                    sections: {
                        projects: [{ title: 'EZ One', summary: '지원 관리 서비스' }],
                        awards: [{ title: '해커톤 대상' }]
                    }
                },
                error: null
            }
        });
        const api = createWorkspaceApi({ get, patch: vi.fn(), post: vi.fn() });
        const workspace = await api.getWorkspace('102');
        const defaults = await api.getDefaults('102');
        expect(get).toHaveBeenNthCalledWith(1, '/api/workspaces/102');
        expect(get).toHaveBeenNthCalledWith(2, '/api/workspaces/102/defaults');
        expect(workspace.companyDetails).toEqual({
            domain: 'naver.com',
            companyType: '대기업',
            size: '1,000명 이상',
            rating: 4.2,
            startingSalary: 5000,
            financialStatus: 'stable'
        });
        expect(defaults.sections.projects).toEqual([
            { title: 'EZ One', summary: '지원 관리 서비스' }
        ]);
        expect(defaults.sections.awards).toEqual([{ title: '해커톤 대상' }]);
    });
    it('WS-001: loads workspace detail and reference boards from /api/workspaces/:id', async () => {
        const get = vi.fn().mockResolvedValue({
            data: {
                success: true,
                data: {
                    id: 102,
                    basketJobId: 101,
                    companyName: '네이버',
                    positionTitle: 'Backend Engineer',
                    deadlineLabel: '오늘 18:00',
                    statusLabel: '진행 중',
                    sourceUrl: 'https://www.jasoseol.com/',
                    questions: [
                        {
                            id: 103,
                            prompt: '문항 1. 지원 동기와 입사 후 기여 계획을 작성하세요.',
                            draft: '서비스 사용 경험과 백엔드 개선 경험을 연결해 초안을 작성합니다.',
                            maxLength: 1000,
                            currentLength: 31
                        }
                    ],
                    references: [
                        {
                            id: 104,
                            boardName: 'JD',
                            referenceType: 'JD',
                            title: 'JD 핵심 역량',
                            body: '사용자가 직접 정리한 직무 요구사항입니다.',
                            url: 'https://www.jasoseol.com/'
                        }
                    ]
                },
                error: null
            }
        });
        const api = createWorkspaceApi({ get, patch: vi.fn(), post: vi.fn() });
        const workspace = await api.getWorkspace('102');
        expect(get).toHaveBeenCalledWith('/api/workspaces/102');
        expect(workspace).toMatchObject({
            id: '102',
            companyName: '네이버',
            questions: [expect.objectContaining({ id: '103' })],
            references: [expect.objectContaining({ id: '104', type: 'JD' })]
        });
    });
    it('WS-002: saves a draft through the workspace draft endpoint', async () => {
        const patch = vi.fn().mockResolvedValue({
            data: {
                success: true,
                data: {
                    id: 103,
                    prompt: '지원 동기를 작성하세요.',
                    draft: '저장된 초안입니다.',
                    maxLength: 1000,
                    currentLength: 9
                },
                error: null
            }
        });
        const api = createWorkspaceApi({ get: vi.fn(), patch, post: vi.fn() });
        const question = await api.saveDraft('102', '103', '저장된 초안입니다.');
        expect(patch).toHaveBeenCalledWith('/api/workspaces/102/drafts/103', {
            body: '저장된 초안입니다.'
        });
        expect(question).toEqual({
            id: '103',
            prompt: '지원 동기를 작성하세요.',
            draft: '저장된 초안입니다.',
            maxLength: 1000
        });
    });
    it('WS-004: creates and lists essay versions', async () => {
        const get = vi.fn().mockResolvedValue({
            data: {
                success: true,
                data: [
                    {
                        id: 501,
                        questionId: 103,
                        versionName: 'v1',
                        body: '초안 v1'
                    }
                ],
                error: null
            }
        });
        const post = vi.fn().mockResolvedValue({
            data: {
                success: true,
                data: {
                    id: 502,
                    questionId: 103,
                    versionName: 'v2',
                    body: '초안 v2'
                },
                error: null
            }
        });
        const api = createWorkspaceApi({ get, patch: vi.fn(), post });
        const created = await api.createVersion('102', '103', 'v2');
        const versions = await api.listVersions('102');
        expect(post).toHaveBeenCalledWith('/api/workspaces/102/versions', {
            questionId: 103,
            versionName: 'v2'
        });
        expect(get).toHaveBeenCalledWith('/api/workspaces/102/versions');
        expect(created).toEqual({
            id: '502',
            questionId: '103',
            versionName: 'v2',
            body: '초안 v2'
        });
        expect(versions).toEqual([
            {
                id: '501',
                questionId: '103',
                versionName: 'v1',
                body: '초안 v1'
            }
        ]);
    });
    it('WS-005/WS-017/WS-018: creates a question and compares versions', async () => {
        const post = vi.fn()
            .mockResolvedValueOnce({
            data: {
                success: true,
                data: {
                    id: 801,
                    prompt: '성장 과정을 작성하세요.',
                    draft: '',
                    maxLength: 700,
                    currentLength: 0
                },
                error: null
            }
        })
            .mockResolvedValueOnce({
            data: {
                success: true,
                data: {
                    leftVersionId: 501,
                    rightVersionId: 502,
                    leftBody: '초안 v1',
                    rightBody: '초안 v2',
                    changed: true
                },
                error: null
            }
        });
        const api = createWorkspaceApi({ get: vi.fn(), patch: vi.fn(), post });
        const question = await api.createQuestion('102', {
            prompt: '성장 과정을 작성하세요.',
            maxLength: 700
        });
        const comparison = await api.compareVersions('102', '501', '502');
        expect(post).toHaveBeenNthCalledWith(1, '/api/workspaces/102/questions', {
            prompt: '성장 과정을 작성하세요.',
            maxLength: 700
        });
        expect(post).toHaveBeenNthCalledWith(2, '/api/workspaces/102/versions/compare', {
            leftVersionId: 501,
            rightVersionId: 502
        });
        expect(question).toEqual({
            id: '801',
            prompt: '성장 과정을 작성하세요.',
            draft: '',
            maxLength: 700
        });
        expect(comparison).toEqual({
            leftVersionId: '501',
            rightVersionId: '502',
            leftBody: '초안 v1',
            rightBody: '초안 v2',
            changed: true
        });
    });
    it('WS-006/WS-007: updates and deletes an essay question', async () => {
        const patch = vi.fn().mockResolvedValue({
            data: {
                success: true,
                data: {
                    id: 103,
                    prompt: '수정한 문항',
                    draft: '기존 초안',
                    maxLength: 700,
                    currentLength: 5
                },
                error: null
            }
        });
        const deleteRequest = vi.fn().mockResolvedValue({
            data: { success: true, data: null, error: null }
        });
        const api = createWorkspaceApi({ get: vi.fn(), patch, post: vi.fn(), delete: deleteRequest });
        await expect(api.updateQuestion('102', '103', {
            prompt: '수정한 문항',
            maxLength: 700
        })).resolves.toEqual({
            id: '103',
            prompt: '수정한 문항',
            draft: '기존 초안',
            maxLength: 700
        });
        await expect(api.deleteQuestion('102', '103')).resolves.toBeUndefined();
        expect(patch).toHaveBeenCalledWith('/api/workspaces/102/questions/103', {
            prompt: '수정한 문항',
            maxLength: 700
        });
        expect(deleteRequest).toHaveBeenCalledWith('/api/workspaces/102/questions/103');
    });
    it('REF-001/REF-002: creates and opens a reference material', async () => {
        const get = vi.fn().mockResolvedValue({
            data: {
                success: true,
                data: {
                    id: 701,
                    boardName: 'MEMO',
                    referenceType: 'FREE_MEMO',
                    title: '면접 메모',
                    body: '직접 입력한 참고자료입니다.',
                    url: 'https://example.com/reference'
                },
                error: null
            }
        });
        const post = vi.fn().mockResolvedValue({
            data: {
                success: true,
                data: {
                    id: 701,
                    boardName: 'MEMO',
                    referenceType: 'FREE_MEMO',
                    title: '면접 메모',
                    body: '직접 입력한 참고자료입니다.',
                    url: 'https://example.com/reference'
                },
                error: null
            }
        });
        const api = createWorkspaceApi({ get, patch: vi.fn(), post });
        const created = await api.createReference('102', {
            boardName: 'MEMO',
            referenceType: 'FREE_MEMO',
            title: '면접 메모',
            body: '직접 입력한 참고자료입니다.',
            url: 'https://example.com/reference'
        });
        const opened = await api.getReference('701');
        expect(post).toHaveBeenCalledWith('/api/workspaces/102/references', {
            boardName: 'MEMO',
            referenceType: 'FREE_MEMO',
            title: '면접 메모',
            body: '직접 입력한 참고자료입니다.',
            url: 'https://example.com/reference'
        });
        expect(get).toHaveBeenCalledWith('/api/references/701');
        expect(created).toEqual({
            id: '701',
            boardName: 'MEMO',
            type: 'FREE_MEMO',
            title: '면접 메모',
            body: '직접 입력한 참고자료입니다.',
            url: 'https://example.com/reference'
        });
        expect(opened).toEqual(created);
    });
    it('REF-004/REF-005: updates and deletes a reference material', async () => {
        const patch = vi.fn().mockResolvedValue({
            data: {
                success: true,
                data: {
                    id: 701,
                    boardName: 'NEWS',
                    referenceType: 'NEWS',
                    title: '산업 뉴스',
                    body: '수정한 참고자료 본문',
                    url: 'https://example.com/news'
                },
                error: null
            }
        });
        const deleteRequest = vi.fn().mockResolvedValue({
            data: { success: true, data: null, error: null }
        });
        const api = createWorkspaceApi({ get: vi.fn(), patch, post: vi.fn(), delete: deleteRequest });
        const updated = await api.updateReference('701', {
            boardName: 'NEWS',
            referenceType: 'NEWS',
            title: '산업 뉴스',
            body: '수정한 참고자료 본문',
            url: 'https://example.com/news'
        });
        await expect(api.deleteReference('701')).resolves.toBeUndefined();
        expect(patch).toHaveBeenCalledWith('/api/references/701', {
            boardName: 'NEWS',
            referenceType: 'NEWS',
            title: '산업 뉴스',
            body: '수정한 참고자료 본문',
            url: 'https://example.com/news'
        });
        expect(deleteRequest).toHaveBeenCalledWith('/api/references/701');
        expect(updated).toEqual({
            id: '701',
            boardName: 'NEWS',
            type: 'NEWS',
            title: '산업 뉴스',
            body: '수정한 참고자료 본문',
            url: 'https://example.com/news'
        });
    });
});
