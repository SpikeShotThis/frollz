// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
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

// Stub <Transition> so v-if children are removed immediately in jsdom
// (real Transition waits for transitionend which never fires without CSS).
const transitionStub = { template: '<slot />' }

function mountNav() {
  return mount(NavBar, {
    global: {
      plugins: [router],
      stubs: { Transition: transitionStub },
    },
    attachTo: document.body,
  })
}

describe('NavBar', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders without a11y violations (drawer closed)', async () => {
    const wrapper = mountNav()
    await router.isReady()

    const results = await axe(wrapper.element, axeOptions)
    expect(results).toHaveNoViolations()
    wrapper.unmount()
  })

  it('renders without a11y violations (drawer open)', async () => {
    const wrapper = mountNav()
    await router.isReady()

    const hamburger = wrapper.find('[aria-label="Open navigation"]')
    await hamburger.trigger('click')
    await flushPromises()

    const results = await axe(document.body, axeOptions)
    expect(results).toHaveNoViolations()
    wrapper.unmount()
  })

  it('hamburger has correct aria attributes', async () => {
    const wrapper = mountNav()
    await router.isReady()

    const hamburger = wrapper.find('[aria-label="Open navigation"]')
    expect(hamburger.attributes('aria-expanded')).toBe('false')
    expect(hamburger.attributes('aria-controls')).toBe('mobile-nav-drawer')

    await hamburger.trigger('click')
    expect(hamburger.attributes('aria-expanded')).toBe('true')
    wrapper.unmount()
  })

  it('opens drawer on hamburger click', async () => {
    const wrapper = mountNav()
    await router.isReady()

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)

    await wrapper.find('[aria-label="Open navigation"]').trigger('click')

    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
    expect(wrapper.find('[role="dialog"]').attributes('aria-modal')).toBe('true')
    wrapper.unmount()
  })

  it('closes drawer on Escape key', async () => {
    const wrapper = mountNav()
    await router.isReady()

    await wrapper.find('[aria-label="Open navigation"]').trigger('click')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)

    await wrapper.find('[role="dialog"]').trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('closes drawer on backdrop click', async () => {
    const wrapper = mountNav()
    await router.isReady()

    await wrapper.find('[aria-label="Open navigation"]').trigger('click')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)

    await wrapper.find('[data-testid="nav-backdrop"]').trigger('click')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('closes drawer on nav link click', async () => {
    const wrapper = mountNav()
    await router.isReady()

    await wrapper.find('[aria-label="Open navigation"]').trigger('click')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)

    const drawerLinks = wrapper.find('[role="dialog"]').findAll('a')
    await drawerLinks[0].trigger('click')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('all five nav links appear in the drawer', async () => {
    const wrapper = mountNav()
    await router.isReady()

    await wrapper.find('[aria-label="Open navigation"]').trigger('click')

    const drawerLinks = wrapper.find('[role="dialog"]').findAll('a')
    const labels = drawerLinks.map((l) => l.text())
    expect(labels).toContain('Dashboard')
    expect(labels).toContain('Film Formats')
    expect(labels).toContain('Stocks')
    expect(labels).toContain('Rolls')
    expect(labels).toContain('Tags')
    wrapper.unmount()
  })
})
