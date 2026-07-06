import { mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import PrivacyPage from './PrivacyPage.vue';

const makeRouter = () => createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/', component: { template: '<div>main</div>' } },
        { path: '/login', component: { template: '<div>login</div>' } },
        { path: '/privacy', component: PrivacyPage }
    ]
});

describe('PrivacyPage', () => {
    it('renders Chrome Web Store privacy policy content in Korean', async () => {
        const router = makeRouter();
        await router.push('/privacy');
        await router.isReady();

        const wrapper = mount(PrivacyPage, {
            global: {
                plugins: [router]
            }
        });

        expect(wrapper.text()).toContain('개인정보처리방침');
        expect(wrapper.text()).toContain('목차');
        expect(wrapper.text()).toContain('처리하는 개인정보 항목과 목적');
        expect(wrapper.text()).toContain('Chrome 확장 프로그램 데이터 처리');
        expect(wrapper.text()).toContain('지원서 제출, 최종 지원, 임시저장 버튼을 자동으로 클릭하지 않습니다.');
        expect(wrapper.text()).toContain('제3자 제공, 처리 위탁, 외부 연동');
        expect(wrapper.text()).toContain('qkralsrb4407@naver.com');
    });
});
