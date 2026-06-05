import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import OnboardingPage from './OnboardingPage.vue'

const mocks = vi.hoisted(() => ({
  getUserProfile: vi.fn(),
  saveUserProfile: vi.fn()
}))

vi.mock('@/features/profile/api/profileApi', () => ({
  profileApi: {
    getUserProfile: mocks.getUserProfile,
    saveUserProfile: mocks.saveUserProfile
  }
}))

const makeRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/onboarding', component: OnboardingPage },
      { path: '/main', component: { template: '<div>main</div>' } },
      { path: '/basket', component: { template: '<div>basket</div>' } },
      { path: '/mypage', component: { template: '<div>mypage</div>' } },
      { path: '/recommendations', component: { template: '<div>recommendations</div>' } },
      { path: '/document-profile', component: { template: '<div>document profile</div>' } }
    ]
  })

describe('OnboardingPage', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem(
      'ezone.currentUser',
      JSON.stringify({
        id: 1,
        email: 'user@example.com',
        name: 'Hong Gil Dong',
        nickname: '',
        profileCompleted: false
      })
    )
    mocks.getUserProfile.mockReset()
    mocks.saveUserProfile.mockReset()
    mocks.getUserProfile.mockResolvedValue({
      desiredRoles: [],
      companyTypes: [],
      industries: [],
      regions: [],
      skills: [],
      ssafy: false,
      completed: false
    })
    mocks.saveUserProfile.mockResolvedValue({
      desiredRoles: ['Backend Developer'],
      companyTypes: ['Startup'],
      industries: ['Commerce'],
      regions: ['Seoul'],
      skills: ['Java', 'Spring Boot'],
      ssafy: false,
      completed: true
    })
  })

  it('ONB-001: saves onboarding preferences and marks the session profile complete', async () => {
    const router = makeRouter()
    router.push('/onboarding')
    await router.isReady()

    const wrapper = mount(OnboardingPage, {
      global: {
        plugins: [createPinia(), router]
      }
    })

    await flushPromises()
    await wrapper.get('[data-testid="save-onboarding"]').trigger('click')
    await flushPromises()

    expect(mocks.saveUserProfile).toHaveBeenCalledWith({
      desiredRoles: ['Backend Developer'],
      companyTypes: ['Startup'],
      industries: ['Commerce'],
      regions: ['Seoul'],
      skills: ['Java', 'Spring Boot'],
      ssafy: false
    })
    expect(router.currentRoute.value.path).toBe('/main')
    expect(JSON.parse(localStorage.getItem('ezone.currentUser') ?? '{}').profileCompleted).toBe(true)
  })
})

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve))
}
