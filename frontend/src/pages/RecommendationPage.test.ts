import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import RecommendationPage from './RecommendationPage.vue'

const mocks = vi.hoisted(() => ({
  listJobs: vi.fn(),
  saveJob: vi.fn()
}))

vi.mock('@/features/recommendations/api/recommendationApi', () => ({
  recommendationApi: {
    listJobs: mocks.listJobs,
    saveJob: mocks.saveJob
  }
}))

const makeRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/recommendations', component: RecommendationPage },
      { path: '/workspaces/:workspaceId', component: { template: '<div>workspace</div>' } },
      { path: '/main', component: { template: '<div>main</div>' } },
      { path: '/basket', component: { template: '<div>basket</div>' } },
      { path: '/mypage', component: { template: '<div>mypage</div>' } },
      { path: '/document-profile', component: { template: '<div>document profile</div>' } }
    ]
  })

describe('RecommendationPage', () => {
  beforeEach(() => {
    mocks.listJobs.mockReset()
    mocks.saveJob.mockReset()
    mocks.listJobs.mockResolvedValue([
      {
        id: '9001',
        companyName: '라인',
        positionTitle: 'Server Platform Engineer',
        deadlineLabel: 'D-7',
        workspaceId: null
      }
    ])
    mocks.saveJob.mockResolvedValue({
      basketJobId: '101',
      workspaceId: '102',
      companyName: '라인',
      positionTitle: 'Server Platform Engineer'
    })
  })

  it('REC-001: renders recommendations and saves one into a workspace', async () => {
    const router = makeRouter()
    router.push('/recommendations')
    await router.isReady()

    const wrapper = mount(RecommendationPage, {
      global: {
        plugins: [createPinia(), router]
      }
    })

    await flushPromises()

    expect(mocks.listJobs).toHaveBeenCalled()
    expect(wrapper.text()).toContain('라인')
    expect(wrapper.text()).toContain('Server Platform Engineer')

    await wrapper.get('[data-testid="save-recommendation-9001"]').trigger('click')
    await flushPromises()

    expect(mocks.saveJob).toHaveBeenCalledWith('9001')
    expect(wrapper.text()).toContain('공고를 담았습니다')
    expect(wrapper.get('[data-testid="saved-workspace-link"]').attributes('href')).toBe('/workspaces/102')
  })
})

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve))
}
