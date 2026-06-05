import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WorkspacePage from './WorkspacePage.vue';
const mocks = vi.hoisted(() => ({
    getWorkspace: vi.fn(),
    getDefaults: vi.fn(),
    listVersions: vi.fn(),
    saveDraft: vi.fn(),
    createVersion: vi.fn(),
    createReference: vi.fn(),
    getReference: vi.fn(),
    updateReference: vi.fn(),
    deleteReference: vi.fn(),
    createQuestion: vi.fn(),
    compareVersions: vi.fn(),
    updateQuestion: vi.fn(),
    deleteQuestion: vi.fn()
}));
vi.mock('@/features/workspace/api/workspaceApi', () => ({
    workspaceApi: {
        getWorkspace: mocks.getWorkspace,
        getDefaults: mocks.getDefaults,
        listVersions: mocks.listVersions,
        saveDraft: mocks.saveDraft,
        createVersion: mocks.createVersion,
        createReference: mocks.createReference,
        getReference: mocks.getReference,
        updateReference: mocks.updateReference,
        deleteReference: mocks.deleteReference,
        createQuestion: mocks.createQuestion,
        compareVersions: mocks.compareVersions,
        updateQuestion: mocks.updateQuestion,
        deleteQuestion: mocks.deleteQuestion
    }
}));
const makeRouter = () => createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/workspaces/:workspaceId', component: WorkspacePage },
        { path: '/main', component: { template: '<div>main</div>' } },
        { path: '/basket', component: { template: '<div>basket</div>' } },
        { path: '/mypage', component: { template: '<div>mypage</div>' } },
        { path: '/recommendations', component: { template: '<div>recommendations</div>' } },
        { path: '/document-profile', component: { template: '<div>document profile</div>' } }
    ]
});
describe('WorkspacePage', () => {
    afterEach(() => {
        vi.useRealTimers();
    });
    beforeEach(() => {
        mocks.getWorkspace.mockReset();
        mocks.getDefaults.mockReset();
        mocks.listVersions.mockReset();
        mocks.saveDraft.mockReset();
        mocks.createVersion.mockReset();
        mocks.createReference.mockReset();
        mocks.getReference.mockReset();
        mocks.updateReference.mockReset();
        mocks.deleteReference.mockReset();
        mocks.createQuestion.mockReset();
        mocks.compareVersions.mockReset();
        mocks.updateQuestion.mockReset();
        mocks.deleteQuestion.mockReset();
        mocks.getWorkspace.mockResolvedValue({
            id: '102',
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
            questions: [
                {
                    id: '103',
                    prompt: '지원동기를 작성하세요.',
                    draft: '기존 초안',
                    maxLength: 1000
                }
            ],
            references: [
                {
                    id: '104',
                    boardName: 'JD',
                    type: 'JD',
                    title: 'JD 핵심 요약',
                    body: 'JD 본문',
                    url: 'https://example.com/jd'
                }
            ]
        });
        mocks.getDefaults.mockResolvedValue({
            workspaceId: '102',
            sections: {
                projects: [{ title: 'EZ One', summary: '지원 관리 서비스' }],
                awards: [{ title: 'Hackathon Grand Prize' }]
            }
        });
        mocks.listVersions.mockResolvedValue([
            {
                id: '501',
                questionId: '103',
                versionName: 'v1',
                body: '초안 v1'
            },
            {
                id: '502',
                questionId: '103',
                versionName: 'v2',
                body: '초안 v2'
            }
        ]);
        mocks.saveDraft.mockResolvedValue({
            id: '103',
            prompt: '지원동기를 작성하세요.',
            draft: '새 초안',
            maxLength: 1000
        });
        mocks.createVersion.mockResolvedValue({
            id: '502',
            questionId: '103',
            versionName: 'v2',
            body: '새 초안'
        });
        mocks.createReference.mockResolvedValue({
            id: '701',
            boardName: 'MEMO',
            type: 'FREE_MEMO',
            title: '새 참고 메모',
            body: '직접 입력한 참고자료입니다.',
            url: ''
        });
        mocks.getReference.mockResolvedValue({
            id: '104',
            boardName: 'JD',
            type: 'JD',
            title: 'JD 핵심 요약',
            body: 'JD 본문',
            url: 'https://example.com/jd'
        });
        mocks.updateReference.mockResolvedValue({
            id: '104',
            boardName: 'NEWS',
            type: 'NEWS',
            title: '산업 뉴스',
            body: '수정한 참고자료 본문',
            url: 'https://example.com/news'
        });
        mocks.deleteReference.mockResolvedValue(undefined);
        mocks.createQuestion.mockResolvedValue({
            id: '801',
            prompt: '성장 과정을 작성하세요.',
            draft: '',
            maxLength: 700
        });
        mocks.compareVersions.mockResolvedValue({
            leftVersionId: '501',
            rightVersionId: '502',
            leftBody: '초안 v1',
            rightBody: '초안 v2',
            changed: true
        });
        mocks.updateQuestion.mockResolvedValue({
            id: '103',
            prompt: '수정한 문항',
            draft: '기존 초안',
            maxLength: 700
        });
        mocks.deleteQuestion.mockResolvedValue(undefined);
    });
    it('WS-002/WS-004: saves a draft and creates an explicit version', async () => {
        const router = makeRouter();
        router.push('/workspaces/102');
        await router.isReady();
        const wrapper = mount(WorkspacePage, {
            global: {
                plugins: [createPinia(), router]
            }
        });
        await flushPromises();
        expect(mocks.getWorkspace).toHaveBeenCalledWith('102');
        expect(mocks.listVersions).toHaveBeenCalledWith('102');
        expect(wrapper.get('[data-testid="draft-editor"]').element.value).toBe('기존 초안');
        await wrapper.get('[data-testid="draft-editor"]').setValue('새 초안');
        await wrapper.get('[data-testid="save-draft"]').trigger('click');
        await flushPromises();
        expect(mocks.saveDraft).toHaveBeenCalledWith('102', '103', '새 초안');
        await wrapper.get('[data-testid="create-version"]').trigger('click');
        await flushPromises();
        expect(mocks.createVersion).toHaveBeenCalledWith('102', '103', 'v3');
        expect(wrapper.text()).toContain('v2');
    });
    it('WS-027/WS-028: renders document profile and company detail panels', async () => {
        const router = makeRouter();
        router.push('/workspaces/102');
        await router.isReady();
        const wrapper = mount(WorkspacePage, {
            global: {
                plugins: [createPinia(), router]
            }
        });
        await flushPromises();
        expect(mocks.getDefaults).toHaveBeenCalledWith('102');
        expect(wrapper.text()).toContain('naver.com');
        expect(wrapper.text()).toContain('5000');
        expect(wrapper.text()).toContain('EZ One');
        expect(wrapper.text()).toContain('Hackathon Grand Prize');
    });
    it('WS-009/WS-011/WS-012: shows character count and auto-saves after 2 idle seconds', async () => {
        const router = makeRouter();
        router.push('/workspaces/102');
        await router.isReady();
        const wrapper = mount(WorkspacePage, {
            global: {
                plugins: [createPinia(), router]
            }
        });
        await flushPromises();
        expect(wrapper.get('[data-testid="draft-character-count"]').text()).toContain('5 / 1000');
        vi.useFakeTimers();
        await wrapper.get('[data-testid="draft-editor"]').setValue('auto saved body');
        expect(wrapper.get('[data-testid="auto-save-status"]').attributes('data-save-state')).toBe('waiting');
        expect(mocks.saveDraft).not.toHaveBeenCalledWith('102', '103', 'auto saved body');
        await vi.advanceTimersByTimeAsync(1999);
        expect(mocks.saveDraft).not.toHaveBeenCalledWith('102', '103', 'auto saved body');
        await vi.advanceTimersByTimeAsync(1);
        expect(mocks.saveDraft).toHaveBeenCalledWith('102', '103', 'auto saved body');
        await Promise.resolve();
        expect(wrapper.get('[data-testid="auto-save-status"]').attributes('data-save-state')).toBe('saved');
    });
    it('REF-001/REF-002: creates a reference and opens reference detail', async () => {
        const router = makeRouter();
        router.push('/workspaces/102');
        await router.isReady();
        const wrapper = mount(WorkspacePage, {
            global: {
                plugins: [createPinia(), router]
            }
        });
        await flushPromises();
        await wrapper.get('[data-testid="create-reference"]').trigger('click');
        await flushPromises();
        expect(mocks.createReference).toHaveBeenCalledWith('102', {
            boardName: 'MEMO',
            referenceType: 'FREE_MEMO',
            title: '새 참고 메모',
            body: '직접 입력한 참고자료입니다.',
            url: ''
        });
        expect(wrapper.text()).toContain('새 참고 메모');
        await wrapper.get('[data-testid="open-reference-104"]').trigger('click');
        await flushPromises();
        expect(mocks.getReference).toHaveBeenCalledWith('104');
        expect(wrapper.text()).toContain('JD 본문');
    });
    it('WS-024/WS-025: shows reference type labels and creates a selected template', async () => {
        const router = makeRouter();
        router.push('/workspaces/102');
        await router.isReady();
        const wrapper = mount(WorkspacePage, {
            global: {
                plugins: [createPinia(), router]
            }
        });
        await flushPromises();
        expect(wrapper.text()).toContain('합격 자소서');
        expect(wrapper.text()).toContain('인재상');
        expect(wrapper.text()).toContain('작성 팁');
        await wrapper.get('[data-testid="new-reference-type"]').setValue('TALENT_PROFILE');
        await wrapper.get('[data-testid="create-reference"]').trigger('click');
        await flushPromises();
        expect(mocks.createReference).toHaveBeenCalledWith('102', {
            boardName: 'TALENT_PROFILE',
            referenceType: 'TALENT_PROFILE',
            title: '인재상 참고자료',
            body: '공고와 회사에 맞는 인재상 키워드를 직접 정리하세요.',
            url: ''
        });
    });
    it('REF-004/REF-005: edits and deletes the active reference', async () => {
        const router = makeRouter();
        router.push('/workspaces/102');
        await router.isReady();
        const wrapper = mount(WorkspacePage, {
            global: {
                plugins: [createPinia(), router]
            }
        });
        await flushPromises();
        await wrapper.get('[data-testid="open-reference-104"]').trigger('click');
        await flushPromises();
        await wrapper.get('[data-testid="reference-type"]').setValue('NEWS');
        await wrapper.get('[data-testid="reference-title"]').setValue('산업 뉴스');
        await wrapper.get('[data-testid="reference-body"]').setValue('수정한 참고자료 본문');
        await wrapper.get('[data-testid="reference-url"]').setValue('https://example.com/news');
        await wrapper.get('[data-testid="save-reference"]').trigger('click');
        await flushPromises();
        expect(mocks.updateReference).toHaveBeenCalledWith('104', {
            boardName: 'NEWS',
            referenceType: 'NEWS',
            title: '산업 뉴스',
            body: '수정한 참고자료 본문',
            url: 'https://example.com/news'
        });
        expect(wrapper.text()).toContain('산업 뉴스');
        await wrapper.get('[data-testid="delete-reference"]').trigger('click');
        await flushPromises();
        expect(mocks.deleteReference).toHaveBeenCalledWith('104');
        expect(wrapper.text()).not.toContain('산업 뉴스');
    });
    it('WS-005/WS-017/WS-018: adds a question and compares two versions', async () => {
        const router = makeRouter();
        router.push('/workspaces/102');
        await router.isReady();
        const wrapper = mount(WorkspacePage, {
            global: {
                plugins: [createPinia(), router]
            }
        });
        await flushPromises();
        await wrapper.get('[data-testid="new-question-prompt"]').setValue('성장 과정을 작성하세요.');
        await wrapper.get('[data-testid="new-question-max"]').setValue(700);
        await wrapper.get('[data-testid="create-question"]').trigger('click');
        await flushPromises();
        expect(mocks.createQuestion).toHaveBeenCalledWith('102', {
            prompt: '성장 과정을 작성하세요.',
            maxLength: 700
        });
        expect(wrapper.text()).toContain('성장 과정을 작성하세요.');
        await wrapper.get('[data-testid="compare-versions"]').trigger('click');
        await flushPromises();
        expect(mocks.compareVersions).toHaveBeenCalledWith('102', '501', '502');
        expect(wrapper.text()).toContain('초안 v1');
        expect(wrapper.text()).toContain('초안 v2');
    });
    it('WS-006/WS-007: updates and deletes the current question', async () => {
        const router = makeRouter();
        router.push('/workspaces/102');
        await router.isReady();
        const wrapper = mount(WorkspacePage, {
            global: {
                plugins: [createPinia(), router]
            }
        });
        await flushPromises();
        await wrapper.get('[data-testid="edit-question-prompt"]').setValue('수정한 문항');
        await wrapper.get('[data-testid="edit-question-max"]').setValue(700);
        await wrapper.get('[data-testid="update-question"]').trigger('click');
        await flushPromises();
        expect(mocks.updateQuestion).toHaveBeenCalledWith('102', '103', {
            prompt: '수정한 문항',
            maxLength: 700
        });
        expect(wrapper.text()).toContain('수정한 문항');
        await wrapper.get('[data-testid="delete-question"]').trigger('click');
        await flushPromises();
        expect(mocks.deleteQuestion).toHaveBeenCalledWith('102', '103');
        expect(wrapper.text()).not.toContain('수정한 문항');
    });
});
function flushPromises() {
    return new Promise((resolve) => setTimeout(resolve));
}
