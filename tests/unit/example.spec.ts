import { mount } from '@vue/test-utils'
import AnasayfaPage from '@/views/AnasayfaPage.vue'
import { describe, expect, test } from 'vitest'

describe('AnasayfaPage.vue', () => {
  test('renders home page title', () => {
    const wrapper = mount(AnasayfaPage)
    expect(wrapper.text()).toMatch('Anasayfa')
  })
})
