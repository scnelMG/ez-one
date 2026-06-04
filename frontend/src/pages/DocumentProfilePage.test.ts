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
          nameKo: '홍길동',
          email: 'user@example.com',
          phone: '010-1234-5678',
          address: '서울'
        }
      },
      customFields: []
    })
    mocks.saveSection.mockResolvedValue({
      sections: {
        basicInfo: {
          nameKo: '김지원',
          email: 'jiwon@example.com',
          phone: '010-1234-5678',
          address: '서울'
        }
      },
      customFields: []
    })
  })

  it('PROFILE-001: renders saved basic info and persists edits', async () => {
    const router = makeRouter()
    router.push('/document-profile')
    await router.isReady()

    const wrapper = mount(DocumentProfilePage, {
      global: {
        plugins: [createPinia(), router]
      }
    })

    await flushPromises()

    expect(mocks.getDocumentProfile).toHaveBeenCalled()
    expect((wrapper.get('[data-testid="basic-info-name"]').element as HTMLInputElement).value).toBe('홍길동')
    expect((wrapper.get('[data-testid="basic-info-email"]').element as HTMLInputElement).value).toBe(
      'user@example.com'
    )

    await wrapper.get('[data-testid="basic-info-name"]').setValue('김지원')
    await wrapper.get('[data-testid="basic-info-email"]').setValue('jiwon@example.com')
    await wrapper.get('button.primary-button').trigger('click')

    expect(mocks.saveSection).toHaveBeenCalledWith('basicInfo', {
      nameKo: '김지원',
      email: 'jiwon@example.com',
      phone: '010-1234-5678',
      address: '서울'
    })
  })
})

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve))
}
