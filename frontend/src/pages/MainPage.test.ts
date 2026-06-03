import { mount } from '@vue/test-utils'
import MainPage from './MainPage.vue'

describe('MainPage', () => {
  it('renders the scaffold entry screen', () => {
    const wrapper = mount(MainPage)

    expect(wrapper.text()).toContain('EZ One')
    expect(wrapper.text()).toContain('P1 scaffold')
  })
})
