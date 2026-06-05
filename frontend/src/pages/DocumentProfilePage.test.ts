import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DocumentProfilePage from './DocumentProfilePage.vue'

const mocks = vi.hoisted(() => ({
  getDocumentProfile: vi.fn(),
  saveSection: vi.fn()
}))

vi.mock('@/features/document-profile/api/documentProfileApi', () => ({
  documentProfileApi: {
    getDocumentProfile: mocks.getDocumentProfile,
    saveSection: mocks.saveSection
  }
}))

const makeRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/document-profile', component: DocumentProfilePage },
      { path: '/main', component: { template: '<div>main</div>' } },
      { path: '/basket', component: { template: '<div>basket</div>' } },
      { path: '/mypage', component: { template: '<div>mypage</div>' } },
      { path: '/recommendations', component: { template: '<div>recommendations</div>' } }
    ]
  })

describe('DocumentProfilePage', () => {
  beforeEach(() => {
    mocks.getDocumentProfile.mockReset()
    mocks.saveSection.mockReset()
    mocks.getDocumentProfile.mockResolvedValue({
      sections: {
        basicInfo: {
          nameKo: 'Hong Gil Dong',
          email: 'user@example.com',
          phone: '010-1234-5678',
          address: 'Seoul'
        },
        projects: [{ title: 'EZ One', summary: 'Job workspace MVP' }],
        awards: [{ title: 'Hackathon Grand Prize', summary: 'P1 service award' }]
      },
      customFields: []
    })
    mocks.saveSection.mockResolvedValue({
      sections: {
        basicInfo: {
          nameKo: 'Kim Jiwon',
          email: 'jiwon@example.com',
          phone: '010-1234-5678',
          address: 'Seoul'
        },
        projects: [{ title: 'EZ One Renewal', summary: 'Workspace and profile integration' }],
        awards: [{ title: 'Hackathon Grand Prize', summary: 'P1 service award' }]
      },
      customFields: []
    })
  })

  it('PROFILE-001: renders saved basic info and persists edits', async () => {
    const wrapper = await mountPage()

    expect(mocks.getDocumentProfile).toHaveBeenCalled()
    expect((wrapper.get('[data-testid="basic-info-name"]').element as HTMLInputElement).value).toBe('Hong Gil Dong')
    expect((wrapper.get('[data-testid="basic-info-email"]').element as HTMLInputElement).value).toBe(
      'user@example.com'
    )

    await wrapper.get('[data-testid="basic-info-name"]').setValue('Kim Jiwon')
    await wrapper.get('[data-testid="basic-info-email"]').setValue('jiwon@example.com')
    await wrapper.get('button.primary-button').trigger('click')

    expect(mocks.saveSection).toHaveBeenCalledWith('basicInfo', {
      nameKo: 'Kim Jiwon',
      email: 'jiwon@example.com',
      phone: '010-1234-5678',
      address: 'Seoul'
    })
  })

  it('PROFILE-004/PROFILE-005: renders and saves project and award sections', async () => {
    const wrapper = await mountPage()

    await wrapper.get('[data-testid="section-projects"]').trigger('click')
    expect((wrapper.get('[data-testid="section-title"]').element as HTMLInputElement).value).toBe('EZ One')
    expect((wrapper.get('[data-testid="section-summary"]').element as HTMLTextAreaElement).value).toBe(
      'Job workspace MVP'
    )

    await wrapper.get('[data-testid="section-title"]').setValue('EZ One Renewal')
    await wrapper.get('[data-testid="section-summary"]').setValue('Workspace and profile integration')
    await wrapper.get('[data-testid="save-section"]').trigger('click')

    expect(mocks.saveSection).toHaveBeenCalledWith('projects', [
      {
        title: 'EZ One Renewal',
        summary: 'Workspace and profile integration'
      }
    ])

    await wrapper.get('[data-testid="section-awards"]').trigger('click')
    expect((wrapper.get('[data-testid="section-title"]').element as HTMLInputElement).value).toBe(
      'Hackathon Grand Prize'
    )
  })
})

async function mountPage() {
  const router = makeRouter()
  router.push('/document-profile')
  await router.isReady()

  const wrapper = mount(DocumentProfilePage, {
    global: {
      plugins: [createPinia(), router]
    }
  })

  await flushPromises()
  return wrapper
}

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve))
}
