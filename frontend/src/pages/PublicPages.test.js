import { mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { describe, expect, it, vi } from 'vitest';
import ExtensionPage from './ExtensionPage.vue';
import PrivacyPage from './PrivacyPage.vue';
import SupportPage from './SupportPage.vue';

vi.mock('@/assets/ez-one-logo-final.png', () => ({ default: '/logo.png' }));

function mountPublicPage(component, path = '/') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component },
      { path: '/login', component: { template: '<div>login</div>' } },
      { path: '/extension', component: ExtensionPage },
      { path: '/privacy', component: PrivacyPage },
      { path: '/support', component: SupportPage }
    ]
  });
  router.push(path);

  return router.isReady().then(() => mount(component, {
    global: {
      plugins: [router]
    }
  }));
}

describe('PublicPages', () => {
  it('EXT-004: renders Chrome Web Store install guidance and both extension functions', async () => {
    vi.stubEnv('VITE_EXTENSION_INSTALL_URL', 'https://chromewebstore.google.com/detail/ez-one-job-saver/oamnhdoaefndncadifgaidefcjaomgdo');
    const wrapper = await mountPublicPage(ExtensionPage, '/extension');

    expect(wrapper.get('h1').text()).toContain('EZ-ONE Chrome 확장 프로그램');
    expect(wrapper.text()).toContain('지원 공고 미리보기와 저장');
    expect(wrapper.text()).toContain('서류 입력 정보 기반 지원서 입력 보조');
    expect(wrapper.text()).toContain('자기소개서 문항은 자동 입력하지 않습니다');
    expect(wrapper.get('[data-testid="extension-install-link"]').attributes('href')).toBe('https://chromewebstore.google.com/detail/ez-one-job-saver/oamnhdoaefndncadifgaidefcjaomgdo');
    expect(wrapper.find('a[href="/privacy"]').exists()).toBe(true);
    expect(wrapper.find('a[href="/support"]').exists()).toBe(true);
  });

  it('MAIN-013: renders standalone public privacy copy from the service terms', async () => {
    const wrapper = await mountPublicPage(PrivacyPage, '/privacy');

    expect(wrapper.get('h1').text()).toContain('개인정보 처리 기준');
    expect(wrapper.text()).toContain('계정 식별 정보');
    expect(wrapper.text()).toContain('온보딩 선호 정보');
    expect(wrapper.text()).toContain('저장 공고');
    expect(wrapper.text()).toContain('워크스페이스 작성 자료');
    expect(wrapper.text()).toContain('서비스 제공, 본인 확인, 보안 유지, 장애 대응');
    expect(wrapper.find('a[href="/support"]').exists()).toBe(true);
  });

  it('SUPPORT-001: renders FAQ-style help and public contact guidance without 1:1 request behavior', async () => {
    const wrapper = await mountPublicPage(SupportPage, '/support');

    expect(wrapper.get('h1').text()).toContain('도움말 및 운영 문의');
    expect(wrapper.text()).toContain('Google 계정만으로 사용할 수 있나요?');
    expect(wrapper.text()).toContain('공고는 어디에 저장되나요?');
    expect(wrapper.text()).toContain('서류 입력 정보와 확장 프로그램은 같은 기능인가요?');
    expect(wrapper.text()).toContain('qkralsrb4407@naver.com');
    expect(wrapper.text()).toContain('eunjaelee058@gmail.com');
    expect(wrapper.text()).not.toContain('1:1 문의');
    expect(wrapper.find('form').exists()).toBe(false);
  });
});
