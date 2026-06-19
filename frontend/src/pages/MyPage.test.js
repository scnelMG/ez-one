import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MyPage from './MyPage.vue';

const mocks = vi.hoisted(() => ({
    updateCurrentUser: vi.fn(),
    withdrawCurrentUser: vi.fn(),
    logout: vi.fn(),
    getUserProfile: vi.fn(),
    saveUserProfile: vi.fn(),
    getMyRequests: vi.fn(),
    createRequest: vi.fn()
}));

vi.mock('@/features/auth/api/authApi', () => ({
    authApi: {
        updateCurrentUser: (...args) => mocks.updateCurrentUser(...args),
        withdrawCurrentUser: (...args) => mocks.withdrawCurrentUser(...args),
        logout: (...args) => mocks.logout(...args)
    }
}));

vi.mock('@/features/profile/api/profileApi', () => ({
    profileApi: {
        getUserProfile: mocks.getUserProfile,
        saveUserProfile: mocks.saveUserProfile
    }
}));

vi.mock('@/features/support/api/supportApi', () => ({
    supportApi: {
        getMyRequests: (...args) => mocks.getMyRequests(...args),
        createRequest: (...args) => mocks.createRequest(...args)
    }
}));

const myRoutes = [
    { path: '/mypage', name: 'mypage-account', component: MyPage, meta: { mypageSection: 'account' } },
    { path: '/mypage/onboarding', name: 'mypage-onboarding', component: MyPage, meta: { mypageSection: 'onboarding' } },
    { path: '/mypage/qna', name: 'mypage-qna', component: MyPage, meta: { mypageSection: 'qna' } },
    { path: '/mypage/inquiry', name: 'mypage-inquiry', component: MyPage, meta: { mypageSection: 'inquiry' } },
    { path: '/mypage/partnership', name: 'mypage-partnership', component: MyPage, meta: { mypageSection: 'partnership' } },
    { path: '/mypage/terms', name: 'mypage-terms', component: MyPage, meta: { mypageSection: 'terms' } }
];

const makeRouter = () => createRouter({
    history: createMemoryHistory(),
    routes: [
        ...myRoutes,
        { path: '/', component: { template: '<div>main</div>' } },
        { path: '/login', component: { template: '<div>login</div>' } },
        { path: '/basket', component: { template: '<div>basket</div>' } },
        { path: '/document-profile', component: { template: '<div>document profile</div>' } },
        { path: '/study', component: { template: '<div>study</div>' } },
        { path: '/recommendations/mattermost', component: { template: '<div>mattermost</div>' } },
        { path: '/history', component: { template: '<div>history</div>' } },
        { path: '/mypage/notion', component: { template: '<div>notion</div>' } }
    ]
});

describe('MyPage', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.stubGlobal('confirm', vi.fn(() => true));
        mocks.updateCurrentUser.mockReset();
        mocks.withdrawCurrentUser.mockReset();
        mocks.logout.mockReset();
        mocks.getUserProfile.mockReset();
        mocks.saveUserProfile.mockReset();
        mocks.getMyRequests.mockReset();
        mocks.createRequest.mockReset();
        mocks.getUserProfile.mockResolvedValue({
            desiredRoles: ['프론트엔드', '백엔드'],
            companyTypes: ['중견기업', '스타트업'],
            industries: ['IT/플랫폼'],
            regions: ['서울', '경기', '원격'],
            skills: ['React', 'TypeScript', 'Node.js'],
            ssafy: true,
            completed: true
        });
        mocks.saveUserProfile.mockResolvedValue({
            desiredRoles: ['AI/ML'],
            companyTypes: ['대기업'],
            industries: ['금융'],
            regions: ['서울'],
            skills: ['Python'],
            ssafy: false,
            completed: true
        });
        mocks.getMyRequests.mockResolvedValue([
            { id: 1, title: 'Notion 동기화 오류', status: 'RECEIVED' }
        ]);
        mocks.createRequest.mockResolvedValue({
            id: 2,
            title: '새 문의',
            status: 'RECEIVED'
        });
        localStorage.setItem('ezone.currentUser', JSON.stringify({
            id: 1,
            email: 'hong.gildong@gmail.com',
            name: '홍길동',
            nickname: '길동',
            profileCompleted: true
        }));
    });

    it('MY-ACCOUNT: renders account content and updates nickname', async () => {
        mocks.updateCurrentUser.mockResolvedValue({
            id: 1,
            email: 'hong.gildong@gmail.com',
            name: '홍길동',
            nickname: '홍길동',
            profileCompleted: true
        });
        const wrapper = await mountPage('/mypage');

        expect(wrapper.text()).toContain('마이페이지 · 내 계정');
        expect(wrapper.find('[data-testid="mypage-left-board"]').exists()).toBe(false);
        expect(wrapper.text()).toContain('Google 계정으로 로그인 중');
        expect(wrapper.text()).toContain('Notion 연동은 계정과 분리해 관리됩니다.');

        await wrapper.get('[data-testid="nickname-input"]').setValue('홍길동');
        await wrapper.get('[data-testid="save-account-profile"]').trigger('click');
        await flushPromises();

        expect(mocks.updateCurrentUser).toHaveBeenCalledWith({ nickname: '홍길동' });
        expect(JSON.parse(localStorage.getItem('ezone.currentUser') ?? '{}').nickname).toBe('홍길동');
        expect(wrapper.text()).toContain('프로필 이름이 저장되었습니다.');
    });

    it('MY-ACCOUNT: shows an inline error when nickname save fails', async () => {
        mocks.updateCurrentUser.mockRejectedValue(new Error('network'));
        const wrapper = await mountPage('/mypage');

        await wrapper.get('[data-testid="nickname-input"]').setValue('홍길동');
        await wrapper.get('[data-testid="save-account-profile"]').trigger('click');
        await flushPromises();

        expect(wrapper.text()).toContain('프로필 이름을 저장하지 못했습니다.');
    });

    it('MY-ACCOUNT: withdraws through /api/me-backed auth api and clears the session', async () => {
        mocks.withdrawCurrentUser.mockResolvedValue({});
        const wrapper = await mountPage('/mypage');

        await wrapper.find('.text-button.danger').trigger('click');
        await flushPromises();

        expect(window.confirm).toHaveBeenCalled();
        expect(mocks.withdrawCurrentUser).toHaveBeenCalled();
        expect(localStorage.getItem('ezone.currentUser')).toBeNull();
    });

    it('MY-ONBOARDING: edits onboarding preferences as chips', async () => {
        const wrapper = await mountPage('/mypage/onboarding');

        expect(wrapper.text()).toContain('마이페이지 · 온보딩 정보');
        expect(wrapper.text()).toContain('프론트엔드');
        expect(wrapper.text()).toContain('지원 준비 기본 정보');

        await wrapper.get('[data-testid="profile-role-option-프론트엔드"]').trigger('click');
        await wrapper.get('[data-testid="profile-role-option-백엔드"]').trigger('click');
        await wrapper.get('[data-testid="profile-role-option-AI/ML"]').trigger('click');
        await wrapper.get('[data-testid="profile-company-option-중견기업"]').trigger('click');
        await wrapper.get('[data-testid="profile-company-option-스타트업"]').trigger('click');
        await wrapper.get('[data-testid="profile-company-option-대기업"]').trigger('click');
        await wrapper.get('[data-testid="profile-industry-option-IT/플랫폼"]').trigger('click');
        await wrapper.get('[data-testid="profile-industry-option-금융"]').trigger('click');
        await wrapper.get('[data-testid="profile-region-option-경기"]').trigger('click');
        await wrapper.get('[data-testid="profile-region-option-원격"]').trigger('click');
        await wrapper.get('[data-testid="profile-skill-remove-React"]').trigger('click');
        await wrapper.get('[data-testid="profile-skill-remove-TypeScript"]').trigger('click');
        await wrapper.get('[data-testid="profile-skill-remove-Node.js"]').trigger('click');
        await wrapper.get('[data-testid="profile-skill-input"]').setValue('Python');
        await wrapper.get('[data-testid="profile-skill-input"]').trigger('keyup.enter');
        await wrapper.get('[data-testid="profile-ssafy-false"]').trigger('click');
        await wrapper.get('[data-testid="save-onboarding-profile"]').trigger('click');
        await flushPromises();

        expect(mocks.saveUserProfile).toHaveBeenCalledWith({
            desiredRoles: ['AI/ML'],
            companyTypes: ['대기업'],
            industries: ['금융'],
            regions: ['서울'],
            skills: ['Python'],
            ssafy: false
        });
        expect(wrapper.text()).toContain('온보딩 정보가 저장되었습니다.');
    });

    it('MY-ONBOARDING: cancels edits and restores the saved profile values', async () => {
        const wrapper = await mountPage('/mypage/onboarding');

        await wrapper.get('[data-testid="profile-role-option-프론트엔드"]').trigger('click');
        await wrapper.get('[data-testid="profile-role-option-AI/ML"]').trigger('click');
        await wrapper.get('[data-testid="profile-skill-input"]').setValue('Python');
        await wrapper.get('[data-testid="profile-skill-input"]').trigger('keyup.enter');
        expect(wrapper.text()).toContain('Python');

        await wrapper.get('[data-testid="cancel-onboarding-profile"]').trigger('click');
        await flushPromises();

        expect(wrapper.get('[data-testid="profile-role-option-프론트엔드"]').classes()).toContain('active');
        expect(wrapper.get('[data-testid="profile-role-option-AI/ML"]').classes()).not.toContain('active');
        expect(wrapper.text()).not.toContain('Python');
        expect(wrapper.text()).toContain('저장된 온보딩 정보로 되돌렸습니다.');
    });

    it('MY-QNA: filters FAQ by search term and renders an empty state', async () => {
        const wrapper = await mountPage('/mypage/qna');

        await wrapper.get('[data-testid="faq-search-input"]').setValue('Notion');
        expect(wrapper.text()).toContain('Notion 이메일이 로그인 이메일과 달라도 되나요?');
        expect(wrapper.text()).not.toContain('자소서는 어떻게 버전 관리하나요?');

        await wrapper.get('[data-testid="faq-search-input"]').setValue('없는 질문');
        expect(wrapper.text()).toContain('검색 결과가 없습니다.');
    });

    it('MY-SUPPORT: submits inquiry to the support API and renders persisted history', async () => {
        const wrapper = await mountPage('/mypage/inquiry');

        expect(mocks.getMyRequests).toHaveBeenCalled();
        expect(wrapper.text()).toContain('Notion 동기화 오류');

        await wrapper.find('input[required]').setValue('새 문의');
        await wrapper.find('textarea').setValue('문의 내용입니다.');
        await wrapper.find('form.support-form').trigger('submit.prevent');
        await flushPromises();

        expect(mocks.createRequest).toHaveBeenCalledWith({
            requestType: 'INQUIRY',
            category: 'ACCOUNT',
            title: '새 문의',
            body: '문의 내용입니다.'
        });
        expect(wrapper.text()).toContain('1:1 문의가 접수되었습니다.');
    });

    it('MY-SUPPORT: submits partnership to the support API instead of a local alert', async () => {
        const wrapper = await mountPage('/mypage/partnership');
        const inputs = wrapper.findAll('input');

        await inputs[0].setValue('EZ Partner');
        await inputs[1].setValue('김담당');
        await inputs[2].setValue('partner@example.com');
        await inputs[3].setValue('010-0000-0000');
        await wrapper.find('textarea').setValue('채용 콘텐츠 제휴를 제안합니다.');
        await wrapper.find('form.support-form').trigger('submit.prevent');
        await flushPromises();

        expect(mocks.createRequest).toHaveBeenCalledWith({
            requestType: 'PARTNERSHIP',
            category: 'CONTENT',
            title: 'EZ Partner 제휴 문의',
            body: '채용 콘텐츠 제휴를 제안합니다.',
            companyName: 'EZ Partner',
            contactName: '김담당',
            contactEmail: 'partner@example.com',
            contactPhone: '010-0000-0000'
        });
        expect(wrapper.text()).toContain('제휴 문의가 접수되었습니다.');
    });

    it('MY-SUPPORT: renders QnA and terms pages as separate pages', async () => {
        expect((await mountPage('/mypage/qna')).text()).toContain('공고별로 첨부 자료는 어디서 보나요?');
        const terms = await mountPage('/mypage/terms');
        expect(terms.text()).toContain('서비스 이용약관');
        expect(terms.text()).toContain('상표 및 로고 표시');
    });
});

async function mountPage(path) {
    const router = makeRouter();
    router.push(path);
    await router.isReady();
    const wrapper = mount(MyPage, {
        global: {
            plugins: [createPinia(), router]
        }
    });
    await flushPromises();
    return wrapper;
}

function flushPromises() {
    return new Promise((resolve) => setTimeout(resolve));
}
