import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LoginPage from './LoginPage.vue'

vi.mock('@/features/auth/oauth/googleOAuth', () => ({
  buildGoogleOAuthUrl: vi.fn(() => new URL('https://accounts.google.com/o/oauth2/v2/auth?state=state-123')),
  createOAuthState: vi.fn(() => 'state-123'),
  getGoogleClientId: vi.fn(() => 'google-client-id'),
  getGoogleRedirectUri: vi.fn(() => 'http://localhost:5173/login/callback')
}))

const makeRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: LoginPage }]
  })

describe('LoginPage', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('AUTH-001: starts real Google OAuth with the protected redirect target', async () => {
    vi.stubGlobal('location', { assign: vi.fn(), origin: 'http://localhost:5173' })
    const router = makeRouter()
    router.push('/?redirect=/basket')
    await router.isReady()

    const wrapper = mount(LoginPage, {
      global: {
        plugins: [router]
      }
    })

    await wrapper.get('button[data-testid="google-login"]').trigger('click')

    expect(location.assign).toHaveBeenCalledWith('https://accounts.google.com/o/oauth2/v2/auth?state=state-123')
  })

  it('EXT-024: exposes local Chrome extension install guidance from the public entry page', async () => {
    const router = makeRouter()
    router.push('/')
    await router.isReady()

    const wrapper = mount(LoginPage, {
      global: {
        plugins: [router]
      }
    })

    expect(wrapper.text()).toContain('Chrome 확장프로그램 설치')
    expect(wrapper.text()).toContain('C:\\ez-one\\extension\\dist')
    expect(wrapper.find('a[href="#extension-install"]').exists()).toBe(true)
  })
})
