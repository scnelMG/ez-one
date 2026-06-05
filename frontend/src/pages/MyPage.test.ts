import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import MyPage from './MyPage.vue'

const mocks = vi.hoisted(() => ({
  updateCurrentUser: vi.fn(),
  getUserProfile: vi.fn(),
  saveUserProfile: vi.fn()
}))

vi.mock('@/features/auth/api/authApi', () => ({
  authApi: {
    updateCurrentUser: (...args: unknown[]) => mocks.updateCurrentUser(...args)
  }
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
      { path: '/mypage', component: MyPage },
      { path: '/main', component: { template: '<div>main</div>' } },
      { path: '/basket', component: { template: '<div>basket</div>' } },
      { path: '/document-profile', component: { template: '<div>document profile</div>' } },
      { path: '/recommendations', component: { template: '<div>recommendations</div>' } },
      { path: '/mypage/notion', component: { template: '<div>Notion</div>' } }
    ]
  })

describe('MyPage', () => {
  beforeEach(() => {
    localStorage.clear()
    mocks.updateCurrentUser.mockReset()
    mocks.getUserProfile.mockReset()
    mocks.saveUserProfile.mockReset()
    mocks.getUserProfile.mockResolvedValue({
      desiredRoles: ['Backend Developer'],
      companyTypes: ['Startup'],
      industries: ['Commerce'],
      regions: ['Seoul'],
      skills: ['Java', 'Spring Boot'],
      ssafy: false,
      completed: true
    })
    mocks.saveUserProfile.mockResolvedValue({
      desiredRoles: ['Platform Engineer'],
      companyTypes: ['Large Enterprise'],
      industries: ['Finance'],
      regions: ['Busan'],
      skills: ['MyBatis', 'MySQL'],
      ssafy: true,
      completed: true
    })
  })

  it('AUTH-014: edits the nickname and updates the stored current user', async () => {
    localStorage.setItem(
      'ezone.currentUser',
      JSON.stringify({
        id: 1,
        email: 'user@example.com',
        name: 'Hong Gil Dong',
        nickname: 'Gil Dong',
        profileCompleted: true
      })
    )
    mocks.updateCurrentUser.mockResolvedValue({
      id: 1,
      email: 'user@example.com',
      name: 'Hong Gil Dong',
      nickname: '길동',
      profileCompleted: true
    })

    const router = makeRouter()
    router.push('/mypage')
    await router.isReady()

    const wrapper = mount(MyPage, {
      global: {
        plugins: [router]
      }
    })

    await wrapper.get('[data-testid="nickname-input"]').setValue('길동')
    await wrapper.get('form').trigger('submit')

    expect(mocks.updateCurrentUser).toHaveBeenCalledWith({ nickname: '길동' })
    expect(JSON.parse(localStorage.getItem('ezone.currentUser') ?? '{}').nickname).toBe('길동')
    expect(wrapper.text()).toContain('저장되었습니다')
    expect(wrapper.text()).not.toMatch(/AUTH-/)
  })

  it('MY-002/MY-003/PROFILE-025: edits onboarding preference fields from my page', async () => {
    localStorage.setItem(
      'ezone.currentUser',
      JSON.stringify({
        id: 1,
        email: 'user@example.com',
        name: 'Hong Gil Dong',
        nickname: 'Gil Dong',
        profileCompleted: true
      })
    )

    const router = makeRouter()
    router.push('/mypage')
    await router.isReady()

    const wrapper = mount(MyPage, {
      global: {
        plugins: [createPinia(), router]
      }
    })

    await flushPromises()

    expect((wrapper.get('[data-testid="profile-desired-roles"]').element as HTMLInputElement).value)
      .toBe('Backend Developer')
    expect((wrapper.get('[data-testid="profile-company-types"]').element as HTMLInputElement).value)
      .toBe('Startup')
    expect((wrapper.get('[data-testid="profile-regions"]').element as HTMLInputElement).value)
      .toBe('Seoul')
    expect((wrapper.get('[data-testid="profile-skills"]').element as HTMLInputElement).value)
      .toBe('Java, Spring Boot')

    await wrapper.get('[data-testid="profile-desired-roles"]').setValue('Platform Engineer')
    await wrapper.get('[data-testid="profile-company-types"]').setValue('Large Enterprise')
    await wrapper.get('[data-testid="profile-industries"]').setValue('Finance')
    await wrapper.get('[data-testid="profile-regions"]').setValue('Busan')
    await wrapper.get('[data-testid="profile-skills"]').setValue('MyBatis, MySQL')
    await wrapper.get('[data-testid="profile-ssafy"]').setValue('true')
    await wrapper.get('[data-testid="profile-preferences-form"]').trigger('submit')
    await flushPromises()

    expect(mocks.saveUserProfile).toHaveBeenCalledWith({
      desiredRoles: ['Platform Engineer'],
      companyTypes: ['Large Enterprise'],
      industries: ['Finance'],
      regions: ['Busan'],
      skills: ['MyBatis', 'MySQL'],
      ssafy: true
    })
  })
})

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve))
}
