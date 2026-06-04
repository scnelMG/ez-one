import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it, vi } from 'vitest'
import BasketPage from './BasketPage.vue'

vi.mock('@/features/basket/api/basketApi', () => ({
  basketApi: {
    listJobs: vi.fn().mockResolvedValue([
      {
        id: '101',
        companyName: '네이버',
        positionTitle: 'Backend Engineer',
        status: 'IN_PROGRESS',
        statusLabel: '진행 중',
        deadlineLabel: '2026.06.11',
        deadlineSoon: true,
        workspaceId: '102',
        sourceUrl: 'https://www.jasoseol.com/'
      },
      {
        id: '104',
        companyName: '카카오페이',
        positionTitle: 'Server Developer',
        status: 'NOT_STARTED',
        statusLabel: '지원 전',
        deadlineLabel: '2026.06.20',
        deadlineSoon: true,
        workspaceId: '105',
        sourceUrl: 'https://www.jasoseol.com/'
      }
    ])
  }
}))

const makeRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/basket', component: BasketPage },
      { path: '/', component: { template: '<div>main</div>' } },
      { path: '/main', component: { template: '<div>main</div>' } },
      { path: '/mypage', component: { template: '<div>my page</div>' } },
      { path: '/workspaces/:workspaceId', component: { template: '<div>workspace</div>' } },
      { path: '/recommendations', component: { template: '<div>recommendations</div>' } },
      { path: '/document-profile', component: { template: '<div>document profile</div>' } }
    ]
  })

describe('BasketPage', () => {
  it('JOB-001/MAIN-015: renders a service-style basket page with logo and workspace links', async () => {
    const router = makeRouter()
    router.push('/basket')
    await router.isReady()

    const wrapper = mount(BasketPage, {
      global: {
        plugins: [createPinia(), router]
      }
    })

    await new Promise((resolve) => setTimeout(resolve))

    expect(wrapper.find('img[alt="EZ One"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('장바구니')
    expect(wrapper.text()).toContain('네이버')
    expect(wrapper.text()).toContain('카카오페이')
    expect(wrapper.find('.week-grid').exists()).toBe(false)

    const hrefs = wrapper.findAll('a').map((link) => link.attributes('href'))
    expect(hrefs).toContain('/workspaces/102')
    expect(hrefs).toContain('/workspaces/105')
  })
})
