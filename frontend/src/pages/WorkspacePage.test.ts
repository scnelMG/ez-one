import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import WorkspacePage from './WorkspacePage.vue'

const mocks = vi.hoisted(() => ({
  getWorkspace: vi.fn(),
  listVersions: vi.fn(),
  saveDraft: vi.fn(),
  createVersion: vi.fn(),
  createReference: vi.fn(),
  getReference: vi.fn(),
  updateReference: vi.fn(),
  deleteReference: vi.fn()
}))

vi.mock('@/features/workspace/api/workspaceApi', () => ({
  workspaceApi: {
    getWorkspace: mocks.getWorkspace,
    listVersions: mocks.listVersions,
    saveDraft: mocks.saveDraft,
    createVersion: mocks.createVersion,
    createReference: mocks.createReference,
    getReference: mocks.getReference,
    updateReference: mocks.updateReference,
    deleteReference: mocks.deleteReference
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
    mocks.createReference.mockReset()
    mocks.getReference.mockReset()
    mocks.updateReference.mockReset()
    mocks.deleteReference.mockReset()
    mocks.getWorkspace.mockResolvedValue({
      id: '102',
      companyName: 'Naver',
      positionTitle: 'Backend Engineer',
      deadlineLabel: 'D-3',
      statusLabel: '진행 중',
      sourceUrl: 'https://www.jasoseol.com/',
      questions: [
        {
          id: '103',
          prompt: '지원동기를 작성하세요.',
          draft: '기존 초안',
          maxLength: 1000
        }
      ],
      references: [
        {
          id: '104',
          boardName: 'JD',
          type: 'JD',
          title: 'JD 핵심 요약',
          body: 'JD 본문',
          url: 'https://example.com/jd'
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
      prompt: '지원동기를 작성하세요.',
      draft: '새 초안',
      maxLength: 1000
    })
    mocks.createVersion.mockResolvedValue({
      id: '502',
      questionId: '103',
      versionName: 'v2',
      body: '새 초안'
    })
    mocks.createReference.mockResolvedValue({
      id: '701',
      boardName: 'MEMO',
      type: 'FREE_MEMO',
      title: '새 참고 메모',
      body: '직접 입력한 참고자료입니다.',
      url: ''
    })
    mocks.getReference.mockResolvedValue({
      id: '104',
      boardName: 'JD',
      type: 'JD',
      title: 'JD 핵심 요약',
      body: 'JD 본문',
      url: 'https://example.com/jd'
    })
    mocks.updateReference.mockResolvedValue({
      id: '104',
      boardName: 'NEWS',
      type: 'NEWS',
      title: '산업 뉴스',
      body: '수정한 참고자료 본문',
      url: 'https://example.com/news'
    })
    mocks.deleteReference.mockResolvedValue(undefined)
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

  it('REF-001/REF-002: creates a reference and opens reference detail', async () => {
    const router = makeRouter()
    router.push('/workspaces/102')
    await router.isReady()

    const wrapper = mount(WorkspacePage, {
      global: {
        plugins: [createPinia(), router]
      }
    })

    await flushPromises()
    await wrapper.get('[data-testid="create-reference"]').trigger('click')
    await flushPromises()

    expect(mocks.createReference).toHaveBeenCalledWith('102', {
      boardName: 'MEMO',
      referenceType: 'FREE_MEMO',
      title: '새 참고 메모',
      body: '직접 입력한 참고자료입니다.',
      url: ''
    })
    expect(wrapper.text()).toContain('새 참고 메모')

    await wrapper.get('[data-testid="open-reference-104"]').trigger('click')
    await flushPromises()

    expect(mocks.getReference).toHaveBeenCalledWith('104')
    expect(wrapper.text()).toContain('JD 본문')
  })

  it('REF-004/REF-005: edits and deletes the active reference', async () => {
    const router = makeRouter()
    router.push('/workspaces/102')
    await router.isReady()

    const wrapper = mount(WorkspacePage, {
      global: {
        plugins: [createPinia(), router]
      }
    })

    await flushPromises()
    await wrapper.get('[data-testid="open-reference-104"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="reference-type"]').setValue('NEWS')
    await wrapper.get('[data-testid="reference-title"]').setValue('산업 뉴스')
    await wrapper.get('[data-testid="reference-body"]').setValue('수정한 참고자료 본문')
    await wrapper.get('[data-testid="reference-url"]').setValue('https://example.com/news')
    await wrapper.get('[data-testid="save-reference"]').trigger('click')
    await flushPromises()

    expect(mocks.updateReference).toHaveBeenCalledWith('104', {
      boardName: 'NEWS',
      referenceType: 'NEWS',
      title: '산업 뉴스',
      body: '수정한 참고자료 본문',
      url: 'https://example.com/news'
    })
    expect(wrapper.text()).toContain('산업 뉴스')

    await wrapper.get('[data-testid="delete-reference"]').trigger('click')
    await flushPromises()

    expect(mocks.deleteReference).toHaveBeenCalledWith('104')
    expect(wrapper.text()).not.toContain('산업 뉴스')
  })
})

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve))
}
