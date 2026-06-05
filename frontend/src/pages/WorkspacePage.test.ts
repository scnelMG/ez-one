import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import WorkspacePage from './WorkspacePage.vue'

const mocks = vi.hoisted(() => ({
  getWorkspace: vi.fn(),
  listVersions: vi.fn(),
  saveDraft: vi.fn(),
  createVersion: vi.fn()
}))

vi.mock('@/features/workspace/api/workspaceApi', () => ({
  workspaceApi: {
    getWorkspace: mocks.getWorkspace,
    listVersions: mocks.listVersions,
    saveDraft: mocks.saveDraft,
    createVersion: mocks.createVersion
  }
}))

const makeRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/workspaces/:workspaceId', component: WorkspacePage },
      { path: '/main', component: { template: '<div>main</div>' } },
      { path: '/basket', component: { template: '<div>basket</div>' } },
      { path: '/mypage', component: { template: '<div>mypage</div>' } },
      { path: '/recommendations', component: { template: '<div>recommendations</div>' } },
      { path: '/document-profile', component: { template: '<div>document profile</div>' } }
    ]
  })

describe('WorkspacePage', () => {
  beforeEach(() => {
    mocks.getWorkspace.mockReset()
    mocks.listVersions.mockReset()
    mocks.saveDraft.mockReset()
    mocks.createVersion.mockReset()
    mocks.getWorkspace.mockResolvedValue({
      id: '102',
      companyName: '네이버',
      positionTitle: 'Backend Engineer',
      deadlineLabel: 'D-3',
      statusLabel: '진행 중',
      sourceUrl: 'https://www.jasoseol.com/',
      questions: [
        {
          id: '103',
          prompt: '지원 동기를 작성하세요.',
          draft: '기존 초안',
          maxLength: 1000
        }
      ],
      references: [
        {
          id: '104',
          type: 'JD',
          title: 'JD 핵심 요약'
        }
      ]
    })
    mocks.listVersions.mockResolvedValue([
      {
        id: '501',
        questionId: '103',
        versionName: 'v1',
        body: '초안 v1'
      }
    ])
    mocks.saveDraft.mockResolvedValue({
      id: '103',
      prompt: '지원 동기를 작성하세요.',
      draft: '새 초안',
      maxLength: 1000
    })
    mocks.createVersion.mockResolvedValue({
      id: '502',
      questionId: '103',
      versionName: 'v2',
      body: '새 초안'
    })
  })

  it('WS-002/WS-004: saves a draft and creates an explicit version', async () => {
    const router = makeRouter()
    router.push('/workspaces/102')
    await router.isReady()

    const wrapper = mount(WorkspacePage, {
      global: {
        plugins: [createPinia(), router]
      }
    })

    await flushPromises()

    expect(mocks.getWorkspace).toHaveBeenCalledWith('102')
    expect(mocks.listVersions).toHaveBeenCalledWith('102')
    expect((wrapper.get('[data-testid="draft-editor"]').element as HTMLTextAreaElement).value).toBe('기존 초안')

    await wrapper.get('[data-testid="draft-editor"]').setValue('새 초안')
    await wrapper.get('[data-testid="save-draft"]').trigger('click')
    await flushPromises()

    expect(mocks.saveDraft).toHaveBeenCalledWith('102', '103', '새 초안')

    await wrapper.get('[data-testid="create-version"]').trigger('click')
    await flushPromises()

    expect(mocks.createVersion).toHaveBeenCalledWith('102', '103', 'v2')
    expect(wrapper.text()).toContain('v2')
  })
})

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve))
}
