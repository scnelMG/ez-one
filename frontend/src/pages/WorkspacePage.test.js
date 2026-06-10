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
        localStorage.clear();
        Object.values(mocks).forEach((mock) => mock.mockReset());
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
                },
                {
                    id: '105',
                    boardName: 'NEWS',
                    type: 'NEWS',
                    title: '산업 뉴스',
                    body: '뉴스 메모',
                    url: 'https://example.com/news'
                }
            ]
        });
        mocks.getDefaults.mockResolvedValue({
            workspaceId: '102',
            sections: {
                projects: [{ title: 'EZ-ONE', summary: '지원 관리 서비스' }],
                awards: [{ title: 'Hackathon Grand Prize', summary: '대상' }]
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
        mocks.createVersion.mockImplementation((_workspaceId, questionId, versionName, body = '새 초안') => Promise.resolve({
            id: '503',
            questionId: String(questionId),
            versionName,
            body
        }));
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

    it('WS-002/WS-027/WS-028: renders the workspace wireframe with job/company info and fixed bottom modes', async () => {
        const wrapper = await mountWorkspace();

        expect(mocks.getWorkspace).toHaveBeenCalledWith('102');
        expect(mocks.getDefaults).toHaveBeenCalledWith('102');
        expect(mocks.listVersions).toHaveBeenCalledWith('102');
        expect(localStorage.getItem('ezone.recentWorkspaces')).toBeNull();
        expect(wrapper.text()).toContain('지원 워크스페이스');
        expect(wrapper.text()).toContain('Naver');
        expect(wrapper.text()).toContain('Backend Engineer');
        expect(wrapper.text()).toContain('naver.com');
        expect(wrapper.get('.workspace-info-panel').text()).toContain('지원정보');
        expect(wrapper.get('.workspace-info-panel').text()).toContain('기업정보');
        expect(wrapper.get('[data-testid="workspace-bottom-tabs"]').text()).toContain('도화지');
        expect(wrapper.get('[data-testid="workspace-bottom-tabs"]').text()).toContain('자소서 버전관리');
    });

    it('WS-011: keeps draft editing on auto-save and removes explicit header save actions', async () => {
        const wrapper = await mountWorkspace();

        expect(getDraftText(wrapper)).toBe('기존 초안');
        expect(wrapper.find('[data-testid="save-draft"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="create-version"]').exists()).toBe(false);
        expect(wrapper.get('.workspace-hero-actions').text()).toContain('채용 사이트');
    });

    it('WS-009: auto-saves after two idle seconds', async () => {
        const wrapper = await mountWorkspace();

        vi.useFakeTimers();
        await setDraftText(wrapper, 'auto saved body');
        expect(wrapper.get('[data-testid="auto-save-status"]').attributes('data-save-state')).toBe('waiting');
        await vi.advanceTimersByTimeAsync(1999);
        expect(mocks.saveDraft).not.toHaveBeenCalledWith('102', '103', 'auto saved body');
        await vi.advanceTimersByTimeAsync(1);
        expect(mocks.saveDraft).toHaveBeenCalledWith('102', '103', 'auto saved body');
    });

    it('REF-001/REF-002: opens side panel boards as a push layout, not a route change', async () => {
        const router = makeRouter();
        router.push('/workspaces/102');
        await router.isReady();
        const wrapper = mount(WorkspacePage, {
            global: {
                plugins: [createPinia(), router]
            }
        });
        await flushPromises();

        expect(wrapper.get('[data-testid="workspace-push-layout"]').classes()).toContain('drawer-open');
        await wrapper.get('[data-testid="panel-trigger-JD"]').trigger('click');
        expect(router.currentRoute.value.fullPath).toBe('/workspaces/102');
        expect(wrapper.get('[data-testid="workspace-side-drawer"]').text()).toContain('JD 게시판');
        expect(wrapper.get('[data-testid="workspace-main-pane"]').attributes('style')).toContain('--drawer-width');

        await wrapper.get('[data-testid="workspace-panel-divider"]').trigger('keydown', { key: 'ArrowLeft' });
        expect(wrapper.get('[data-testid="workspace-main-pane"]').attributes('style')).toContain('464px');

        await wrapper.get('[data-testid="board-full-view"]').trigger('click');
        await flushPromises();
        expect(document.body.textContent).toContain('전체 보기');
        expect(document.body.textContent).toContain('JD 게시판');
        expect(document.body.textContent).toContain('마크다운으로 입력하거나 이미지를 붙여넣으세요.');
    });

    it('REF-001: side panel supports the requested board types without page navigation', async () => {
        const wrapper = await mountWorkspace();

        for (const [type, title] of [
            ['NEWS', '뉴스기사 게시판'],
            ['DART', 'DART 게시판'],
            ['TALENT_PROFILE', '인재상 게시판'],
            ['AWARDS_PROJECTS', '서류 / 프로젝트'],
            ['PROMPT', '프롬프트 게시판'],
            ['FREE_MEMO', '메모 게시판']
        ]) {
            await wrapper.get(`[data-testid="panel-trigger-${type}"]`).trigger('click');
            expect(wrapper.get('[data-testid="workspace-side-drawer"]').text()).toContain(title);
        }
    });

    it('REF-001: renders pasted markdown syntax inside the board editor', async () => {
        const wrapper = await mountWorkspace();
        const editor = wrapper.get('[data-testid="markdown-editor"]');
        const originalExecCommand = document.execCommand;
        document.execCommand = vi.fn((command, _showUi, value) => {
            if (command === 'insertHTML') {
                editor.element.innerHTML += value;
            }
            return true;
        });
        try {
            const pasteEvent = new Event('paste', { bubbles: true, cancelable: true });
            Object.defineProperty(pasteEvent, 'clipboardData', {
                value: {
                    items: [],
                    getData: () => '# 제목\n- 항목\n**강조**와 [링크](https://example.com)'
                }
            });
            editor.element.dispatchEvent(pasteEvent);
            await flushPromises();

            expect(editor.element.querySelector('h2')?.textContent).toBe('제목');
            expect(editor.element.querySelector('li')?.textContent).toBe('항목');
            expect(editor.element.querySelector('strong')?.textContent).toBe('강조');
            expect(editor.element.querySelector('a')?.getAttribute('href')).toBe('https://example.com');
        } finally {
            document.execCommand = originalExecCommand;
        }
    });

    it('REF-006: renders board-specific inputs for news, DART, talent, prompt, and profile boards', async () => {
        const wrapper = await mountWorkspace();

        await wrapper.get('[data-testid="panel-trigger-NEWS"]').trigger('click');
        await wrapper.get('[data-testid="article-title-input"]').setValue('신규 기사');
        await wrapper.get('[data-testid="article-url-input"]').setValue('https://example.com/article');
        await setEditorText(wrapper, 'article-body-input', '기사 내용 요약');
        await wrapper.get('[data-testid="workspace-side-drawer"]').findAll('button').find((button) => button.text() === '저장').trigger('click');
        expect(wrapper.get('[data-testid="workspace-side-drawer"]').text()).toContain('수집한 기사');
        expect(wrapper.get('[data-testid="workspace-side-drawer"]').text()).toContain('신규 기사');
        expect(wrapper.get('[data-testid="workspace-side-drawer"]').text()).toContain('기사 내용 요약');
        expect(wrapper.get('[data-testid="workspace-side-drawer"]').text()).toContain('example.com');

        await wrapper.get('[data-testid="panel-trigger-DART"]').trigger('click');
        expect(wrapper.get('[data-testid="workspace-side-drawer"]').text()).toContain('확인 경로');
        expect(wrapper.get('[data-testid="workspace-side-drawer"]').text()).toContain('주요 계약 및 연구 개발 활동');
        await wrapper.get('[data-testid="save-dart-entry"]').trigger('click');
        expect(wrapper.get('[data-testid="workspace-side-drawer"]').text()).toContain('저장한 DART 메모');

        await wrapper.get('[data-testid="panel-trigger-TALENT_PROFILE"]').trigger('click');
        expect(wrapper.get('[data-testid="workspace-side-drawer"]').text()).toContain('핵심 가치 / 키워드');
        expect(wrapper.get('[aria-label="새 키워드"]').exists()).toBe(true);

        await wrapper.get('[data-testid="panel-trigger-PROMPT"]').trigger('click');
        expect(wrapper.get('[data-testid="workspace-side-drawer"]').text()).toContain('저장한 프롬프트가 없습니다.');
        await wrapper.get('[data-testid="workspace-side-drawer"]').findAll('button').find((button) => button.text() === '+ 프롬프트 추가').trigger('click');
        const promptInputs = wrapper.get('[data-testid="workspace-side-drawer"]').findAll('input');
        await promptInputs.find((input) => input.attributes('placeholder') === '프롬프트 이름').setValue('지원동기 포인트 정리');
        await promptInputs.find((input) => input.attributes('placeholder')?.includes('직접 입력')).setValue('지원동기');
        await promptInputs.find((input) => input.attributes('placeholder') === '이 프롬프트를 언제 쓰는지').setValue('지원동기 정리');
        await setEditorText(wrapper, 'prompt-body-editor', '> 기업 정보를 바탕으로 지원동기 키워드를 정리해줘.');
        await wrapper.get('[data-testid="workspace-side-drawer"]').findAll('button').find((button) => button.text() === '저장').trigger('click');
        expect(wrapper.get('[data-testid="workspace-side-drawer"]').text()).toContain('지원동기 포인트 정리');
        await wrapper.get('[data-testid="workspace-side-drawer"]').findAll('button').find((button) => button.text() === '지원동기').trigger('click');
        expect(wrapper.get('[data-testid="workspace-side-drawer"]').text()).toContain('지원동기 정리');

        await wrapper.get('[data-testid="panel-trigger-AWARDS_PROJECTS"]').trigger('click');
        expect(wrapper.get('[data-testid="workspace-side-drawer"]').text()).toContain('수상');
        expect(wrapper.get('[data-testid="workspace-side-drawer"]').text()).toContain('프로젝트');
        expect(wrapper.find('[data-testid="award-title-0"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="project-title-0"]').exists()).toBe(true);
    });

    it('REF-004/REF-005: saves JD notes into the local board list', async () => {
        const wrapper = await mountWorkspace();

        await wrapper.get('[data-testid="panel-trigger-JD"]').trigger('click');
        await wrapper.get('[data-testid="board-title-input"]').setValue('JD 핵심 요구사항');
        await wrapper.get('[data-testid="markdown-editor"]').element.dispatchEvent(new InputEvent('input', { bubbles: true }));
        await wrapper.get('[data-testid="workspace-side-drawer"]').findAll('button').find((button) => button.text() === '저장').trigger('click');
        expect(wrapper.get('[data-testid="workspace-side-drawer"]').text()).toContain('저장한 목록');
        expect(wrapper.get('[data-testid="workspace-side-drawer"]').text()).toContain('JD 핵심 요구사항');
        expect(mocks.updateReference).not.toHaveBeenCalled();
        expect(mocks.deleteReference).not.toHaveBeenCalled();
    });

    it('WS-017/WS-018: version management also keeps the side panel available', async () => {
        const wrapper = await mountWorkspace();

        await wrapper.get('[data-testid="mode-versions"]').trigger('click');
        expect(wrapper.get('[data-testid="workspace-bottom-tabs"]').classes()).toContain('is-fixed');
        expect(wrapper.get('[data-testid="workspace-side-drawer"]').exists()).toBe(true);
        expect(wrapper.get('[data-testid="version-question-tab-1"]').classes()).toContain('active');
        expect(wrapper.text()).toContain('v1');
        expect(wrapper.text()).toContain('v2');
        expect(wrapper.get('[data-testid="version-diff"]').text()).toContain('초안 v1');
        expect(wrapper.get('[data-testid="version-diff"]').text()).toContain('초안 v2');
        expect(wrapper.find('.diff-row.is-remove').exists()).toBe(true);
        expect(wrapper.find('.diff-row.is-add').exists()).toBe(true);

        await wrapper.get('[data-testid="compare-versions"]').trigger('click');
        await flushPromises();
        expect(mocks.compareVersions).toHaveBeenCalledWith('102', '501', '502');
        expect(wrapper.text()).toContain('초안 v1');
        expect(wrapper.text()).toContain('초안 v2');

        await wrapper.get('[data-testid="final-essay-title"]').setValue('최종본');
        await wrapper.get('[data-testid="final-essay-body"]').setValue('저장한 최종 자소서');
        await wrapper.get('[data-testid="save-final-essay"]').trigger('click');
        await flushPromises();
        expect(mocks.createVersion).toHaveBeenCalledWith('102', '103', '최종본', '저장한 최종 자소서');
        expect(wrapper.get('[data-testid="right-version-select"]').text()).toContain('최종본');

        await wrapper.get('[data-testid="version-question-tab-2"]').trigger('click');
        expect(wrapper.get('[data-testid="version-question-tab-2"]').classes()).toContain('active');
    });

    it('WS-011: switches character count between including and excluding spaces', async () => {
        const wrapper = await mountWorkspace();

        await setDraftText(wrapper, '가 나 다');
        expect(wrapper.get('[data-testid="draft-character-count"]').text()).toContain('5 / 1000자');

        await wrapper.get('[data-testid="count-without-spaces"]').trigger('click');
        expect(wrapper.get('[data-testid="draft-character-count"]').text()).toContain('3 / 1000자');

        await wrapper.get('[data-testid="count-with-spaces"]').trigger('click');
        expect(wrapper.get('[data-testid="draft-character-count"]').text()).toContain('5 / 1000자');
    });

    it('WS-018: saves a titled final essay in version management', async () => {
        const wrapper = await mountWorkspace();

        await wrapper.get('[data-testid="mode-versions"]').trigger('click');
        await wrapper.get('[data-testid="final-essay-title"]').setValue('네이버 최종본');
        await wrapper.get('[data-testid="final-essay-body"]').setValue('완성 자소서 본문');
        await wrapper.get('[data-testid="save-final-essay"]').trigger('click');

        expect(mocks.createVersion).toHaveBeenCalledWith('102', '103', '네이버 최종본', '완성 자소서 본문');
        expect(wrapper.text()).toContain('네이버 최종본');
        expect(wrapper.text()).toContain('완성 자소서 본문');
    });

    it('WS-005: edits an existing question prompt and character limit', async () => {
        const wrapper = await mountWorkspace();

        await wrapper.get('[data-testid="edit-question-prompt"]').setValue('수정한 문항');
        await wrapper.get('[data-testid="edit-question-max"]').setValue(700);
        await wrapper.get('[data-testid="edit-question-prompt"]').trigger('blur');
        await flushPromises();

        expect(mocks.updateQuestion).toHaveBeenCalledWith('102', '103', {
            prompt: '수정한 문항',
            maxLength: 700
        });
        expect(JSON.parse(localStorage.getItem('ezone.recentWorkspaces'))).toEqual(['102']);
    });

    it('WS-005/WS-006/WS-007: keeps three default canvas questions and adds local question tabs', async () => {
        const wrapper = await mountWorkspace();

        expect(wrapper.get('[data-testid="question-tab-1"]').text()).toBe('1');
        expect(wrapper.get('[data-testid="question-tab-2"]').text()).toBe('2');
        expect(wrapper.get('[data-testid="question-tab-3"]').text()).toBe('3');

        await wrapper.get('[data-testid="question-tab-2"]').trigger('click');
        expect(getDraftText(wrapper)).toBe('');
        await setDraftText(wrapper, '2번 문항 로컬 초안');
        expect(wrapper.get('[data-testid="auto-save-status"]').attributes('data-save-state')).toBe('saved');
        expect(mocks.saveDraft).not.toHaveBeenCalledWith('102', 'default-2', '2번 문항 로컬 초안');

        await wrapper.get('[data-testid="create-question"]').trigger('click');
        await flushPromises();
        expect(wrapper.get('[data-testid="question-tab-4"]').text()).toBe('4');
        expect(wrapper.get('[data-testid="edit-question-prompt"]').element.value).toBe('문항4.');
        expect(mocks.createQuestion).not.toHaveBeenCalled();
        expect(mocks.deleteQuestion).not.toHaveBeenCalled();
        expect(JSON.parse(localStorage.getItem('ezone.recentWorkspaces'))).toEqual(['102']);
    });
});

async function mountWorkspace() {
    const router = makeRouter();
    router.push('/workspaces/102');
    await router.isReady();
    const wrapper = mount(WorkspacePage, {
        global: {
            plugins: [createPinia(), router]
        }
    });
    await flushPromises();
    return wrapper;
}

function getDraftText(wrapper) {
    return wrapper.get('[data-testid="draft-editor"]').element.textContent.trim();
}

async function setDraftText(wrapper, value) {
    const editor = wrapper.get('[data-testid="draft-editor"]');
    editor.element.innerHTML = value;
    await editor.trigger('input');
}

async function setEditorText(wrapper, testId, value) {
    const editor = wrapper.get(`[data-testid="${testId}"]`);
    editor.element.innerHTML = value;
    await editor.trigger('input');
}

function flushPromises() {
    return new Promise((resolve) => setTimeout(resolve));
}
