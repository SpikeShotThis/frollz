// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { axe } from 'vitest-axe'
import NavBar from '@/components/NavBar.vue'

// jsdom does not implement window.matchMedia; stub it so theme store initialises cleanly
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', name: 'dashboard', component: { template: '<div/>' } },
    { path: '/formats', name: 'formats', component: { template: '<div/>' } },
    { path: '/stocks', name: 'stocks', component: { template: '<div/>' } },
    { path: '/rolls', name: 'rolls', component: { template: '<div/>' } },
    { path: '/tags', name: 'tags', component: { template: '<div/>' } },
  ],
})

const axeOptions = {
  runOnly: { type: 'tag' as const, values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
}

describe('NavBar', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders without a11y violations', async () => {
    const wrapper = mount(NavBar, {
      global: { plugins: [router] },
    })
    await router.isReady()

    const results = await axe(wrapper.element, axeOptions)
    expect(results).toHaveNoViolations()
  })
})
