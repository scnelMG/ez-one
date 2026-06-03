import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import MainPage from './MainPage.vue'

const makeRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: MainPage },
      { path: '/basket', component: { template: '<div>공고함</div>' } },
      { path: '/workspaces/:workspaceId', component: { template: '<div>워크스페이스</div>' } },
      { path: '/recommendations', component: { template: '<div>추천공고</div>' } },
      { path: '/document-profile', component: { template: '<div>서류정보</div>' } },
      { path: '/mypage/notion', component: { template: '<div>노션</div>' } }
    ]
  })

describe('MainPage', () => {
  it('renders the Korean P1 dashboard route shell', async () => {
    const router = makeRouter()
    router.push('/')
    await router.isReady()

    const wrapper = mount(MainPage, {
      global: {
        plugins: [router]
      }
    })

    expect(wrapper.text()).toContain('지원 현황 대시보드')
    expect(wrapper.text()).toContain('오늘 마감')
    expect(wrapper.text()).toContain('공고함')
    expect(wrapper.text()).toContain('DASH-001')
    expect(wrapper.text()).toContain('JOB-001')
    expect(wrapper.text()).toContain('REC-001')
  })
})
