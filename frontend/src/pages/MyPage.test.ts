import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import MyPage from './MyPage.vue'

const updateCurrentUser = vi.fn()

vi.mock('@/features/auth/api/authApi', () => ({
  authApi: {
    updateCurrentUser: (...args: unknown[]) => updateCurrentUser(...args)
  }
}))

const makeRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/mypage', component: MyPage },
      { path: '/main', component: { template: '<div>메인</div>' } },
      { path: '/basket', component: { template: '<div>공고 장바구니</div>' } },
      { path: '/document-profile', component: { template: '<div>서류 정보</div>' } },
      { path: '/recommendations', component: { template: '<div>추천 공고</div>' } },
      { path: '/mypage/notion', component: { template: '<div>Notion</div>' } }
    ]
  })

describe('MyPage', () => {
  beforeEach(() => {
    localStorage.clear()
    updateCurrentUser.mockReset()
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
    updateCurrentUser.mockResolvedValue({
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

    expect(updateCurrentUser).toHaveBeenCalledWith({ nickname: '길동' })
    expect(JSON.parse(localStorage.getItem('ezone.currentUser') ?? '{}').nickname).toBe('길동')
    expect(wrapper.text()).toContain('저장되었습니다')
  })
})
