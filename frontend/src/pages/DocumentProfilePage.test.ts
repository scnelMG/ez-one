import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DocumentProfilePage from './DocumentProfilePage.vue'

const mocks = vi.hoisted(() => ({
  getDocumentProfile: vi.fn(),
  saveSection: vi.fn(),
  createCustomField: vi.fn(),
  updateCustomField: vi.fn(),
  deleteCustomField: vi.fn()
}))

vi.mock('@/features/document-profile/api/documentProfileApi', () => ({
  documentProfileApi: {
    getDocumentProfile: mocks.getDocumentProfile,
    saveSection: mocks.saveSection,
    createCustomField: mocks.createCustomField,
    updateCustomField: mocks.updateCustomField,
    deleteCustomField: mocks.deleteCustomField
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
    mocks.createCustomField.mockReset()
    mocks.updateCustomField.mockReset()
    mocks.deleteCustomField.mockReset()
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
      customFields: [
        {
          id: '501',
          label: 'Portfolio',
          fieldType: 'URL',
          value: 'https://example.com'
        }
      ]
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
    mocks.createCustomField.mockResolvedValue({
      id: '601',
      label: 'Blog',
      fieldType: 'URL',
      value: 'https://blog.example.com'
    })
    mocks.updateCustomField.mockResolvedValue({
      id: '501',
      label: 'Portfolio Updated',
      fieldType: 'URL',
      value: 'https://example.com/updated'
    })
    mocks.deleteCustomField.mockResolvedValue(undefined)
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

  it('PROFILE-001/PROFILE-006: creates, updates, and deletes custom fields', async () => {
    const wrapper = await mountPage()

    await wrapper.get('[data-testid="section-custom"]').trigger('click')
    expect(wrapper.text()).toContain('Portfolio')

    await wrapper.get('[data-testid="custom-label"]').setValue('Blog')
    await wrapper.get('[data-testid="custom-type"]').setValue('URL')
    await wrapper.get('[data-testid="custom-value"]').setValue('https://blog.example.com')
    await wrapper.get('[data-testid="create-custom-field"]').trigger('click')

    expect(mocks.createCustomField).toHaveBeenCalledWith({
      label: 'Blog',
      fieldType: 'URL',
      value: 'https://blog.example.com'
    })

    await wrapper.get('[data-testid="edit-custom-501"]').trigger('click')
    await wrapper.get('[data-testid="custom-label"]').setValue('Portfolio Updated')
    await wrapper.get('[data-testid="custom-value"]').setValue('https://example.com/updated')
    await wrapper.get('[data-testid="update-custom-field"]').trigger('click')

    expect(mocks.updateCustomField).toHaveBeenCalledWith('501', {
      label: 'Portfolio Updated',
      fieldType: 'URL',
      value: 'https://example.com/updated'
    })

    await wrapper.get('[data-testid="delete-custom-501"]').trigger('click')
    expect(mocks.deleteCustomField).toHaveBeenCalledWith('501')
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
