import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MyPage from './MyPage.vue';

const mocks = vi.hoisted(() => ({
    updateCurrentUser: vi.fn(),
    getUserProfile: vi.fn(),
    saveUserProfile: vi.fn()
}));

vi.mock('@/features/auth/api/authApi', () => ({
    authApi: {
        updateCurrentUser: (...args) => mocks.updateCurrentUser(...args)
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
    { path: '/mypage/inquiry', name: 'mypage-inquiry', component: MyPage, meta: { mypageSection: 'inquiry' } },
    { path: '/mypage/partnership', name: 'mypage-partnership', component: MyPage, meta: { mypageSection: 'partnership' } },
    { path: '/mypage/terms', name: 'mypage-terms', component: MyPage, meta: { mypageSection: 'terms' } }
];

const makeRouter = () => createRouter({
    history: createMemoryHistory(),
    routes: [
        ...myRoutes,
        { path: '/', component: { template: '<div>main</div>' } },
        { path: '/basket', component: { template: '<div>basket</div>' } },
        { path: '/document-profile', component: { template: '<div>document profile</div>' } },
        { path: '/recommendations', component: { template: '<div>recommendations</div>' } },
        { path: '/mypage/notion', component: { template: '<div>notion</div>' } }
    ]
});

describe('MyPage', () => {
    beforeEach(() => {
        localStorage.clear();
        mocks.updateCurrentUser.mockReset();
        mocks.getUserProfile.mockReset();
        mocks.saveUserProfile.mockReset();
        mocks.getUserProfile.mockResolvedValue({
            desiredRoles: ['프론트엔드', '백엔드'],
            companyTypes: ['중견기업', '스타트업'],
            industries: ['IT/플랫폼'],
            regions: ['서울', '경기', '원격(재택)'],
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
        localStorage.setItem('ezone.currentUser', JSON.stringify({
            id: 1,
            email: 'hong.gildong@gmail.com',
            name: '홍길동',
            nickname: '길동',
            profileCompleted: true
        }));
    });

    it('MY-ACCOUNT: renders account content without the old left board list and updates nickname', async () => {
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
        expect(wrapper.text()).toContain('노션 연동 계정과 우리 서비스 로그인 계정이 다를 수 있어요.');

        await wrapper.get('[data-testid="nickname-input"]').setValue('홍길동');
        await wrapper.get('[data-testid="save-account-profile"]').trigger('click');
        expect(mocks.updateCurrentUser).toHaveBeenCalledWith({ nickname: '홍길동' });
        expect(JSON.parse(localStorage.getItem('ezone.currentUser') ?? '{}').nickname).toBe('홍길동');
    });

    it('MY-ONBOARDING: edits onboarding recommendation preferences as chips', async () => {
        const wrapper = await mountPage('/mypage/onboarding');

        expect(wrapper.text()).toContain('마이페이지 · 온보딩 정보');
        expect(wrapper.text()).toContain('맞춤 추천 정보');
        expect(wrapper.text()).toContain('프론트엔드');
        expect(wrapper.text()).toContain('Mattermost 공고');

        await wrapper.get('[data-testid="profile-desired-roles"]').setValue('AI/ML');
        await wrapper.get('[data-testid="profile-company-types"]').setValue('대기업');
        await wrapper.get('[data-testid="profile-industries"]').setValue('금융');
        await wrapper.get('[data-testid="profile-regions"]').setValue('서울');
        await wrapper.get('[data-testid="profile-skills"]').setValue('Python');
        await wrapper.get('[data-testid="profile-ssafy"]').setValue('false');
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
    });

    it('MY-SUPPORT: renders QnA, inquiry, partnership, and terms pages as separate pages', async () => {
        expect((await mountPage('/mypage/qna')).text()).toContain('공고별로 첨부한 자료는 어디서 보나요?');
        expect((await mountPage('/mypage/inquiry')).text()).toContain('1:1 문의 작성');
        expect((await mountPage('/mypage/partnership')).text()).toContain('제휴 문의');
        expect((await mountPage('/mypage/terms')).text()).toContain('서비스 이용약관');
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
