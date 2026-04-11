// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { axe } from 'vitest-axe'
import RollsView from '@/views/RollsView.vue'
import { filmApi, emulsionApi, transitionApi } from '@/services/api-client'
import type { Film } from '@/types'
import { randomInt } from 'crypto'

const randomId = () => randomInt(1, 1000000);

const axeOptions = {
  runOnly: { type: 'tag' as const, values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
}

vi.mock('@/services/api-client', () => ({
  filmApi: {
    getAll: vi.fn(),
    create: vi.fn(),
  },
  emulsionApi: {
    getAll: vi.fn(),
  },
  transitionApi: {
    getProfiles: vi.fn(),
  },
}))

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', name: 'rolls', component: RollsView },
    { path: '/rolls/:key', name: 'roll-detail', component: { template: '<div/>' } },
  ],
})

const makeFilm = (overrides: Partial<Film> = {}): Film => ({
  id: randomId(),
  name: 'roll-00001',
  emulsionId: randomId(),
  expirationDate: new Date('2025-12-01'),
  parentId: null,
  transitionProfileId: randomId(),
  tags: [],
  states: [],
  ...overrides,
})

const mockProfiles = [
  { id: 'prof-standard', name: 'standard' },
  { id: 'prof-bulk', name: 'bulk' },
  { id: 'prof-instant', name: 'instant' },
]

describe('RollsView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.mocked(filmApi.getAll).mockResolvedValue({ data: [] } as any)
    vi.mocked(emulsionApi.getAll).mockResolvedValue({ data: [] } as any)
    vi.mocked(transitionApi.getProfiles).mockResolvedValue({ data: mockProfiles } as any)
  })

  describe('accessibility', () => {
    it('renders the films list without a11y violations', async () => {
      const wrapper = mount(RollsView, { global: { plugins: [router] } })
      await flushPromises()

      const results = await axe(wrapper.element, axeOptions)
      expect(results).toHaveNoViolations()
    })

    it('renders the Add Film modal without a11y violations', async () => {
      const wrapper = mount(RollsView, { global: { plugins: [router] } })
      await flushPromises()

      const vm = wrapper.vm as any
      vm.openAddFilm()
      await wrapper.vm.$nextTick()

      const results = await axe(wrapper.element, axeOptions)
      expect(results).toHaveNoViolations()
    })
  })

  describe('component mounting', () => {
    it('should load films and profiles on mount', async () => {
      mount(RollsView, { global: { plugins: [router] } })
      await flushPromises()

      expect(filmApi.getAll).toHaveBeenCalled()
      expect(transitionApi.getProfiles).toHaveBeenCalled()
    })

    it('should display films after loading', async () => {
      const film = makeFilm({ name: 'roll-00042' })
      vi.mocked(filmApi.getAll).mockResolvedValue({ data: [film] } as any)

      const wrapper = mount(RollsView, { global: { plugins: [router] } })
      await flushPromises()

      expect(wrapper.text()).toContain('roll-00042')
    })

    it('should show empty state when no films', async () => {
      const wrapper = mount(RollsView, { global: { plugins: [router] } })
      await flushPromises()

      expect(wrapper.text()).toContain('No films found')
    })
  })

  describe('bulk films', () => {
    it('should identify bulk films by transition profile', async () => {
      const bulkFilm = makeFilm({ transitionProfileId: 'prof-bulk', name: 'canister-001' })
      const standardFilm = makeFilm({ transitionProfileId: 'prof-standard', name: 'roll-00001' })
      vi.mocked(filmApi.getAll).mockResolvedValue({ data: [bulkFilm, standardFilm] } as any)

      const wrapper = mount(RollsView, { global: { plugins: [router] } })
      await flushPromises()

      const vm = wrapper.vm as any
      expect(vm.bulkFilms).toHaveLength(1)
      expect(vm.bulkFilms[0].name).toBe('canister-001')
    })
  })

  describe('state filtering', () => {
    it('should call filmApi.getAll with state param when states are selected', async () => {
      const wrapper = mount(RollsView, { global: { plugins: [router] } })
      await flushPromises()

      const vm = wrapper.vm as any
      vm.selectedStates = ['Added']
      await flushPromises()

      expect(filmApi.getAll).toHaveBeenCalledWith({ state: ['Added'] })
    })

    it('should call filmApi.getAll without params when state filter is cleared', async () => {
      const wrapper = mount(RollsView, { global: { plugins: [router] } })
      await flushPromises()

      const vm = wrapper.vm as any
      vm.selectedStates = ['Added']
      await flushPromises()
      vm.clearStateFilter()
      await flushPromises()

      expect(filmApi.getAll).toHaveBeenLastCalledWith(undefined)
    })
  })

  describe('add film form', () => {
    it('should open modal and set standard profile on openAddFilm', async () => {
      const wrapper = mount(RollsView, { global: { plugins: [router] } })
      await flushPromises()

      const vm = wrapper.vm as any
      vm.openAddFilm()
      await wrapper.vm.$nextTick()

      expect(vm.showModal).toBe(true)
      expect(vm.form.transitionProfileId).toBe('prof-standard')
    })

    it('should set bulk profile when isBulkFilm is toggled on', async () => {
      const wrapper = mount(RollsView, { global: { plugins: [router] } })
      await flushPromises()

      const vm = wrapper.vm as any
      vm.openAddFilm()
      vm.form.isBulkFilm = true
      vm.onBulkFilmToggle()
      await wrapper.vm.$nextTick()

      expect(vm.form.transitionProfileId).toBe('prof-bulk')
    })

    it('should reset to standard profile when isBulkFilm is toggled off', async () => {
      const wrapper = mount(RollsView, { global: { plugins: [router] } })
      await flushPromises()

      const vm = wrapper.vm as any
      vm.openAddFilm()
      vm.form.isBulkFilm = true
      vm.onBulkFilmToggle()
      vm.form.isBulkFilm = false
      vm.onBulkFilmToggle()
      await wrapper.vm.$nextTick()

      expect(vm.form.transitionProfileId).toBe('prof-standard')
    })

    it('should close modal and reset form on closeModal', async () => {
      const wrapper = mount(RollsView, { global: { plugins: [router] } })
      await flushPromises()

      const vm = wrapper.vm as any
      vm.openAddFilm()
      vm.form.name = 'test-roll'
      vm.closeModal()
      await wrapper.vm.$nextTick()

      expect(vm.showModal).toBe(false)
      expect(vm.form.name).toBe('')
    })
  })
})
