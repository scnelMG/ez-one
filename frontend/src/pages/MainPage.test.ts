import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { vi } from 'vitest'
import MainPage from './MainPage.vue'

vi.mock('@/features/dashboard/api/dashboardApi', () => ({
  dashboardApi: {
    getSummary: vi.fn().mockResolvedValue({
      summary: {
        totalApplications: 3,
        inProgress: 1,
        notStarted: 1,
        deadlineSoon: 2
      },
      todayJobs: [
        {
          companyName: '네이버',
          positionTitle: 'Backend Engineer',
          deadlineLabel: '오늘 18:00',
          workspaceId: '102'
        }
      ]
    })
  }
}))

const makeRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: MainPage },
      { path: '/login', component: { template: '<div>로그인</div>' } },
      { path: '/basket', component: { template: '<div>공고함</div>' } },
      { path: '/mypage', component: { template: '<div>내 정보</div>' } },
      { path: '/workspaces/:workspaceId', component: { template: '<div>워크스페이스</div>' } },
      { path: '/recommendations', component: { template: '<div>추천 공고</div>' } },
      { path: '/document-profile', component: { template: '<div>서류 정보</div>' } },
      { path: '/mypage/notion', component: { template: '<div>Notion</div>' } }
    ]
  })

describe('MainPage', () => {
  it('DASH-001: renders the Korean P1 dashboard route shell with core flow links', async () => {
    const router = makeRouter()
    router.push('/')
    await router.isReady()

    const wrapper = mount(MainPage, {
      global: {
        plugins: [createPinia(), router]
      }
    })

    await new Promise((resolve) => setTimeout(resolve))

    expect(wrapper.text()).toContain('메인 대시보드')
    expect(wrapper.text()).toContain('오늘 마감')
    expect(wrapper.text()).toContain('공고함 열기')
    expect(wrapper.text()).toContain('DASH-001')
    expect(wrapper.text()).toContain('JOB-001')
    expect(wrapper.text()).toContain('REC-001')

    const links = wrapper.findAll('a').map((link) => link.attributes('href'))
    expect(links).toContain('/basket')
    expect(links).toContain('/workspaces/102')
  })
})
