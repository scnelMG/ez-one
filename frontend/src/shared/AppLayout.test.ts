import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it } from 'vitest'
import AppLayout from './AppLayout.vue'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div>login</div>' } },
      { path: '/main', component: { template: '<div>main</div>' } },
      { path: '/basket', component: { template: '<div>basket</div>' } },
      { path: '/document-profile', component: { template: '<div>document profile</div>' } },
      { path: '/recommendations', component: { template: '<div>recommendations</div>' } },
      { path: '/mypage', component: { template: '<div>mypage</div>' } }
    ]
  })
}

describe('AppLayout', () => {
  it('ALERT-001: keeps alert IA visible but disabled for P1', async () => {
    const router = makeRouter()
    router.push('/main')
    await router.isReady()

    const wrapper = mount(AppLayout, {
      global: {
        plugins: [router]
      }
    })

    const alertEntry = wrapper.get('[data-testid="reserved-alerts"]')

    expect(alertEntry.attributes('aria-disabled')).toBe('true')
    expect(alertEntry.element.tagName).not.toBe('BUTTON')
  })
})
