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
    saveUserProfile: vi.fn()
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

const myRoutes = [
    { path: '/mypage', name: 'mypage-account', component: MyPage, meta: { mypageSection: 'account' } },
    { path: '/mypage/onboarding', name: 'mypage-onboarding', component: MyPage, meta: { mypageSection: 'onboarding' } },
    { path: '/mypage/qna', name: 'mypage-qna', component: MyPage, meta: { mypageSection: 'qna' } },
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
        mocks.getUserProfile.mockResolvedValue({
            desiredRoles: ['SW 개발', '프론트엔드', '백엔드'],
            companyTypes: ['중견기업', '스타트업'],
            industries: ['IT/플랫폼'],
            regions: ['서울', '경기', '원격'],
            skills: ['React', 'TypeScript', 'Node.js'],
            ssafy: true,
            completed: true
        });
        mocks.saveUserProfile.mockResolvedValue({
            desiredRoles: ['AI/데이터', 'AI/ML'],
            companyTypes: ['대기업'],
            industries: ['금융'],
            regions: ['서울'],
            skills: ['Python', 'SQL'],
            ssafy: false,
            completed: true
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

        expect(wrapper.get('.page-header h1').text()).toBe('내 계정');
        expect(wrapper.find('.page-header .eyebrow').exists()).toBe(false);
        expect(wrapper.find('.page-header h1 + p').exists()).toBe(false);
        expect(wrapper.text()).not.toContain('마이페이지 ·');
        expect(wrapper.find('[data-testid="mypage-left-board"]').exists()).toBe(false);
        const accountPanel = wrapper.get('[aria-label="내 계정"]');
        expect(accountPanel.find('.account-identity-card').exists()).toBe(true);
        expect(accountPanel.findAll('.account-setting-row')).toHaveLength(3);
        expect(accountPanel.findAll('.account-setting-label').map((label) => label.text())).toEqual([
            '프로필 사진',
            '이름',
            'Google 계정'
        ]);
        expect(accountPanel.text()).toContain('Google 계정');
        expect(accountPanel.text()).toContain('비밀번호 없음');
        expect(accountPanel.text()).not.toContain('Notion');
        expect(accountPanel.find('a[href="/mypage/notion"]').exists()).toBe(false);
        expect(wrapper.find('.section-heading').exists()).toBe(false);
        expect(wrapper.text()).not.toContain('로그인 정보');
        expect(wrapper.text()).not.toContain('상단 프로필과 문의 내역');
        expect(wrapper.text()).not.toContain('연결 상태와 동기화 범위');

        await wrapper.get('[data-testid="nickname-input"]').setValue('홍길동');
        await wrapper.get('[data-testid="save-account-profile"]').trigger('click');
        await flushPromises();

        expect(mocks.updateCurrentUser).toHaveBeenCalledWith({ nickname: '홍길동' });
        expect(JSON.parse(localStorage.getItem('ezone.currentUser') ?? '{}').nickname).toBe('홍길동');
        expect(wrapper.text()).toContain('프로필 이름이 저장되었습니다.');
    });

    it('MY-ACCOUNT: uploads a profile photo into the current account session', async () => {
        mocks.updateCurrentUser.mockResolvedValue({
            id: 1,
            email: 'user@example.com',
            name: '민구',
            nickname: '민구',
            profileImageUrl: 'data:image/png;base64,profile-photo'
        });
        mockFileReader('data:image/png;base64,profile-photo');
        const wrapper = await mountPage('/mypage');
        const input = wrapper.get('[data-testid="profile-photo-input"]');
        const file = new File(['profile'], 'profile.png', { type: 'image/png' });

        Object.defineProperty(input.element, 'files', {
            value: [file],
            configurable: true
        });
        await input.trigger('change');
        await flushPromises();

        expect(mocks.updateCurrentUser).toHaveBeenCalledWith({
            nickname: '길동',
            profileImageUrl: 'data:image/png;base64,profile-photo'
        });
        expect(wrapper.get('[data-testid="account-profile-photo"]').attributes('src')).toBe('data:image/png;base64,profile-photo');
        expect(JSON.parse(localStorage.getItem('ezone.currentUser') ?? '{}').profileImageUrl).toBe('data:image/png;base64,profile-photo');
        expect(wrapper.text()).toContain('프로필 사진이 저장되었습니다.');
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

        expect(wrapper.get('.page-header h1').text()).toBe('온보딩 정보');
        expect(wrapper.text()).not.toContain('마이페이지 · 온보딩 정보');
        expect(wrapper.text()).toContain('관심 직무군');
        expect(wrapper.text()).toContain('SW 개발');
        expect(wrapper.text()).toContain('프론트엔드');
        expect(wrapper.text()).toContain('AI/데이터');
        expect(wrapper.text()).toContain('클라우드/인프라');
        expect(wrapper.text()).toContain('계열 / 업종');
        expect(wrapper.text()).toContain('SSAFY 전용 공고와 추천 기준에 사용됩니다.');
        expect(wrapper.find('.preference-form').exists()).toBe(true);
        expect(wrapper.find('.mypage-summary-strip').exists()).toBe(false);
        expect(wrapper.find('[aria-label="온보딩 정보"] > .section-heading').exists()).toBe(false);

        await wrapper.get('[data-testid="profile-role-group-option-SW 개발"]').trigger('click');
        await wrapper.get('[data-testid="profile-role-group-option-AI/데이터"]').trigger('click');
        await wrapper.get('[data-testid="profile-role-detail-option-AI/ML"]').trigger('click');
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
        await wrapper.get('[data-testid="profile-skill-suggestion-SQL"]').trigger('click');
        await wrapper.get('[data-testid="profile-ssafy-false"]').trigger('click');
        await wrapper.get('[data-testid="save-onboarding-profile"]').trigger('click');
        await flushPromises();

        expect(mocks.saveUserProfile).toHaveBeenCalledWith({
            desiredRoles: ['AI/데이터', 'AI/ML'],
            companyTypes: ['대기업'],
            industries: ['금융'],
            regions: ['서울'],
            skills: ['Python', 'SQL'],
            ssafy: false
        });
        expect(wrapper.text()).toContain('온보딩 정보가 저장되었습니다.');
    });

    it('MY-ONBOARDING: cancels edits and restores the saved profile values', async () => {
        const wrapper = await mountPage('/mypage/onboarding');

        await wrapper.get('[data-testid="profile-role-detail-option-프론트엔드"]').trigger('click');
        await wrapper.get('[data-testid="profile-role-group-option-AI/데이터"]').trigger('click');
        await wrapper.get('[data-testid="profile-role-detail-option-AI/ML"]').trigger('click');
        await wrapper.get('[data-testid="profile-skill-input"]').setValue('Python');
        await wrapper.get('[data-testid="profile-skill-input"]').trigger('keyup.enter');
        expect(wrapper.text()).toContain('Python');

        await wrapper.get('[data-testid="cancel-onboarding-profile"]').trigger('click');
        await flushPromises();

        expect(wrapper.get('[data-testid="profile-role-group-option-SW 개발"]').classes()).toContain('active');
        expect(wrapper.get('[data-testid="profile-role-detail-option-프론트엔드"]').classes()).toContain('active');
        expect(wrapper.get('[data-testid="profile-role-detail-option-백엔드"]').classes()).toContain('active');
        expect(wrapper.get('[data-testid="profile-role-group-option-AI/데이터"]').classes()).not.toContain('active');
        expect(wrapper.find('[data-testid="profile-skill-remove-Python"]').exists()).toBe(false);
        expect(wrapper.text()).toContain('저장된 온보딩 정보로 되돌렸습니다.');
    });

    it('MY-QNA: filters FAQ by search term and renders an empty state', async () => {
        const wrapper = await mountPage('/mypage/qna');
        const searchInput = wrapper.get('[data-testid="faq-search-input"]');

        expect(wrapper.get('.page-header h1').text()).toBe('자주 묻는 질문');
        expect(searchInput.attributes('type')).toBe('search');
        expect(searchInput.attributes('name')).toBe('faqSearch');
        expect(searchInput.attributes('aria-label')).toBe('FAQ 검색');
        expect(wrapper.find('[aria-label="자주 묻는 질문"] > .section-heading').exists()).toBe(false);
        expect(wrapper.findAll('[data-testid^="faq-filter-"]').every((filter) => filter.element.tagName === 'BUTTON')).toBe(true);
        expect(wrapper.find('.faq-list').exists()).toBe(true);
        expect(wrapper.findAll('.faq-row').length).toBeGreaterThanOrEqual(11);
        expect(wrapper.text()).not.toContain('P1');
        expect(wrapper.text()).not.toContain('P2');
        expect(wrapper.text()).not.toContain('JOB_ONLY');

        await searchInput.setValue('Notion');
        expect(wrapper.text()).toContain('Notion 이메일이 로그인 이메일과 달라도 되나요?');
        expect(wrapper.text()).not.toContain('자소서는 어떻게 버전 관리하나요?');

        await searchInput.setValue('없는 질문');
        expect(wrapper.text()).toContain('검색 결과가 없습니다.');
        expect(wrapper.text()).not.toContain('1:1 문의');
    });

    it('SUPPORT-001: does not expose the retired business support surface', async () => {
        const wrapper = await mountPage('/mypage/qna');
        const retiredPath = ['/mypage', 'partner', 'ship'].join('/');
        const retiredLabel = '제휴' + ' 문의';

        expect(myRoutes.some((route) => route.path === retiredPath)).toBe(false);
        expect(myRoutes.some((route) => route.path === '/mypage/inquiry')).toBe(false);
        expect(wrapper.text()).not.toContain(retiredLabel);
        expect(wrapper.find(`a[href="${retiredPath}"]`).exists()).toBe(false);
        expect(wrapper.find('a[href="/mypage/inquiry"]').exists()).toBe(false);
    });

    it('MY-SUPPORT: renders QnA and terms pages as separate pages', async () => {
        expect((await mountPage('/mypage/qna')).text()).toContain('공고별 첨부 자료는 어디서 보나요?');
        const terms = await mountPage('/mypage/terms');
        expect(terms.get('.page-header h1').text()).toBe('이용약관');
        expect(terms.find('.terms-tabs').exists()).toBe(false);
        expect(terms.find('[aria-label="이용약관"] > .section-heading').exists()).toBe(false);
        expect(terms.text()).toContain('관련 기준');
        expect(terms.text()).toContain('약관의 규제에 관한 법률');
        expect(terms.text()).toContain('개인정보 보호법');
        expect(terms.text()).toContain('제1조 목적 및 적용');
        expect(terms.text()).toContain('제2조 용어의 정의');
        expect(terms.text()).toContain('약관의 게시 및 변경');
        expect(terms.text()).toContain('계정 및 로그인');
        expect(terms.text()).toContain('공고와 기업 정보 표시');
        expect(terms.text()).toContain('외부 연동');
        expect(terms.text()).toContain('탈퇴 및 이용 제한');
        expect(terms.text()).not.toContain('1:1 문의');
        expect(terms.text()).toContain('서비스 변경 및 중단');
        expect(terms.text()).toContain('손해배상 및 책임 제한');
        expect(terms.text()).toContain('준거법 및 분쟁 해결');
        expect(terms.find('#privacy').exists()).toBe(true);
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

function mockFileReader(result) {
    class MockFileReader {
        readAsDataURL() {
            this.result = result;
            setTimeout(() => this.onload?.(), 0);
        }
    }
    vi.stubGlobal('FileReader', MockFileReader);
}
