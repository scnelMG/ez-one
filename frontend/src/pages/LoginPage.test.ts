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
})
