// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import RollsView from '@/views/RollsView.vue'
import { rollApi, stockApi } from '@/services/api-client'
import { RollState, ObtainmentMethod } from '@/types'

vi.mock('@/services/api-client', () => ({
  rollApi: {
    getAll: vi.fn(),
    getNextId: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  stockApi: {
    getAll: vi.fn(),
  },
}))

const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: RollsView }] })

const makeRoll = (key: string, state: RollState, overrides: Record<string, any> = {}) => ({
  _key: key,
  rollId: `roll-${key}`,
  stockKey: 'stock1',
  state,
  dateObtained: new Date('2024-01-01'),
  obtainmentMethod: ObtainmentMethod.PURCHASE,
  obtainedFrom: 'B&H',
  timesExposedToXrays: 0,
  ...overrides,
})

describe('RollsView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(rollApi.getAll).mockResolvedValue({ data: [] } as any)
    vi.mocked(rollApi.getNextId).mockResolvedValue({ data: '00001' } as any)
    vi.mocked(stockApi.getAll).mockResolvedValue({ data: [] } as any)
  })

  describe('shelved spelling', () => {
    it('should display "Shelved" state correctly', async () => {
      vi.mocked(rollApi.getAll).mockResolvedValue({
        data: [makeRoll('r1', RollState.SHELFED)],
      } as any)

      const wrapper = mount(RollsView, { global: { plugins: [router] } })
      await flushPromises()

      expect(wrapper.text()).toContain('Shelved')
      expect(wrapper.text()).not.toContain('Shelfed')
    })
  })

  describe('filtering', () => {
    const multiRolls = [
      makeRoll('r1', RollState.FROZEN,  { rollId: 'roll-r1', obtainedFrom: 'B&H',    timesExposedToXrays: 0 }),
      makeRoll('r2', RollState.LOADED,  { rollId: 'roll-r2', obtainedFrom: 'Moment', timesExposedToXrays: 2 }),
      makeRoll('r3', RollState.SHELFED, { rollId: 'roll-r3', obtainedFrom: 'B&H',    timesExposedToXrays: 0 }),
    ]

    beforeEach(() => {
      vi.mocked(rollApi.getAll).mockResolvedValue({ data: multiRolls } as any)
    })

    it('should start with no active filters and show placeholder', async () => {
      const wrapper = mount(RollsView, { global: { plugins: [router] } })
      await flushPromises()

      const vm = wrapper.vm as any
      expect(vm.activeFilters).toEqual([])
      expect(wrapper.text()).toContain('Click any value in the table to filter by that field')
    })

    it('should add a filter via addFilter', async () => {
      const wrapper = mount(RollsView, { global: { plugins: [router] } })
      await flushPromises()

      const vm = wrapper.vm as any
      vm.addFilter('state', 'State', 'Frozen')
      await wrapper.vm.$nextTick()

      expect(vm.activeFilters).toHaveLength(1)
      expect(vm.activeFilters[0]).toEqual({ field: 'state', label: 'State', value: 'Frozen' })
    })

    it('should filter filteredRolls by an active filter', async () => {
      const wrapper = mount(RollsView, { global: { plugins: [router] } })
      await flushPromises()

      const vm = wrapper.vm as any
      vm.addFilter('state', 'State', 'Frozen')
      await wrapper.vm.$nextTick()

      expect(vm.filteredRolls).toHaveLength(1)
      expect(vm.filteredRolls[0].state).toBe('Frozen')
    })

    it('should apply multiple filters with AND logic', async () => {
      const wrapper = mount(RollsView, { global: { plugins: [router] } })
      await flushPromises()

      const vm = wrapper.vm as any
      vm.addFilter('obtainedFrom', 'Obtained From', 'B&H')
      vm.addFilter('timesExposedToXrays', 'X-Ray Exposures', '0')
      await wrapper.vm.$nextTick()

      // r1 (Frozen, B&H, 0) and r3 (Shelved, B&H, 0) both match
      expect(vm.filteredRolls).toHaveLength(2)
    })

    it('should not add duplicate filters', async () => {
      const wrapper = mount(RollsView, { global: { plugins: [router] } })
      await flushPromises()

      const vm = wrapper.vm as any
      vm.addFilter('state', 'State', 'Frozen')
      vm.addFilter('state', 'State', 'Frozen')
      await wrapper.vm.$nextTick()

      expect(vm.activeFilters).toHaveLength(1)
    })

    it('should remove a specific filter chip', async () => {
      const wrapper = mount(RollsView, { global: { plugins: [router] } })
      await flushPromises()

      const vm = wrapper.vm as any
      vm.addFilter('state', 'State', 'Frozen')
      vm.addFilter('obtainedFrom', 'Obtained From', 'B&H')
      vm.removeFilter(0)
      await wrapper.vm.$nextTick()

      expect(vm.activeFilters).toHaveLength(1)
      expect(vm.activeFilters[0].field).toBe('obtainedFrom')
    })

    it('should clear all filters', async () => {
      const wrapper = mount(RollsView, { global: { plugins: [router] } })
      await flushPromises()

      const vm = wrapper.vm as any
      vm.addFilter('state', 'State', 'Frozen')
      vm.addFilter('obtainedFrom', 'Obtained From', 'B&H')
      vm.clearFilters()
      await wrapper.vm.$nextTick()

      expect(vm.activeFilters).toHaveLength(0)
      expect(vm.filteredRolls).toHaveLength(3)
    })

    it('should show chips with "field: value" format and hide placeholder', async () => {
      const wrapper = mount(RollsView, { global: { plugins: [router] } })
      await flushPromises()

      const vm = wrapper.vm as any
      vm.addFilter('state', 'State', 'Frozen')
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('State: Frozen')
      expect(wrapper.text()).not.toContain('Click any value in the table to filter by that field')
    })

    it('should show Clear all button only when filters are active', async () => {
      const wrapper = mount(RollsView, { global: { plugins: [router] } })
      await flushPromises()

      expect(wrapper.text()).not.toContain('Clear all')

      const vm = wrapper.vm as any
      vm.addFilter('state', 'State', 'Frozen')
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('Clear all')
    })

    it('should not add a filter when value is empty', async () => {
      const wrapper = mount(RollsView, { global: { plugins: [router] } })
      await flushPromises()

      const vm = wrapper.vm as any
      vm.addFilter('obtainedFrom', 'Obtained From', '')
      await wrapper.vm.$nextTick()

      expect(vm.activeFilters).toHaveLength(0)
    })
  })

  describe('canLoad', () => {
    it.each([RollState.FROZEN, RollState.REFRIGERATED, RollState.SHELFED])(
      'should show Load button for %s state',
      async (state) => {
        vi.mocked(rollApi.getAll).mockResolvedValue({ data: [makeRoll('r1', state)] } as any)

        const wrapper = mount(RollsView, { global: { plugins: [router] } })
        await flushPromises()

        expect(wrapper.text()).toContain('Load')
      }
    )

    it.each([RollState.LOADED, RollState.FINISHED, RollState.DEVELOPED])(
      'should not show Load button for %s state',
      async (state) => {
        vi.mocked(rollApi.getAll).mockResolvedValue({ data: [makeRoll('r1', state)] } as any)

        const wrapper = mount(RollsView, { global: { plugins: [router] } })
        await flushPromises()

        const loadButtons = wrapper.findAll('button').filter(b => b.text() === 'Load')
        expect(loadButtons).toHaveLength(0)
      }
    )
  })

  describe('sorting', () => {
    const multiRolls = [
      makeRoll('c', RollState.SHELFED, { rollId: 'roll-c', obtainedFrom: 'Amazon', dateObtained: new Date('2024-03-01'), timesExposedToXrays: 3 }),
      makeRoll('a', RollState.FROZEN,  { rollId: 'roll-a', obtainedFrom: 'B&H',    dateObtained: new Date('2024-01-01'), timesExposedToXrays: 0 }),
      makeRoll('b', RollState.LOADED,  { rollId: 'roll-b', obtainedFrom: 'Moment', dateObtained: new Date('2024-02-01'), timesExposedToXrays: 1 }),
    ]

    beforeEach(() => {
      vi.mocked(rollApi.getAll).mockResolvedValue({ data: multiRolls } as any)
    })

    it('should default sort by rollId ascending', async () => {
      const wrapper = mount(RollsView, { global: { plugins: [router] } })
      await flushPromises()

      const vm = wrapper.vm as any
      expect(vm.sortField).toBe('rollId')
      expect(vm.sortDirection).toBe('asc')
      expect(vm.filteredRolls.map((r: any) => r.rollId)).toEqual(['roll-a', 'roll-b', 'roll-c'])
    })

    it('should sort by a different field when setSort is called', async () => {
      const wrapper = mount(RollsView, { global: { plugins: [router] } })
      await flushPromises()

      const vm = wrapper.vm as any
      vm.setSort('obtainedFrom')
      await wrapper.vm.$nextTick()

      expect(vm.sortField).toBe('obtainedFrom')
      expect(vm.sortDirection).toBe('asc')
      expect(vm.filteredRolls.map((r: any) => r.obtainedFrom)).toEqual(['Amazon', 'B&H', 'Moment'])
    })

    it('should toggle sort direction when the same field is clicked again', async () => {
      const wrapper = mount(RollsView, { global: { plugins: [router] } })
      await flushPromises()

      const vm = wrapper.vm as any
      vm.setSort('rollId') // already rollId/asc → flip to desc
      await wrapper.vm.$nextTick()

      expect(vm.sortDirection).toBe('desc')
      expect(vm.filteredRolls.map((r: any) => r.rollId)).toEqual(['roll-c', 'roll-b', 'roll-a'])
    })

    it('should reset to ascending when switching to a new field', async () => {
      const wrapper = mount(RollsView, { global: { plugins: [router] } })
      await flushPromises()

      const vm = wrapper.vm as any
      vm.setSort('rollId') // flip to desc
      vm.setSort('obtainedFrom') // new field → asc
      await wrapper.vm.$nextTick()

      expect(vm.sortField).toBe('obtainedFrom')
      expect(vm.sortDirection).toBe('asc')
    })

    it('should sort numerically by timesExposedToXrays', async () => {
      const wrapper = mount(RollsView, { global: { plugins: [router] } })
      await flushPromises()

      const vm = wrapper.vm as any
      vm.setSort('timesExposedToXrays')
      await wrapper.vm.$nextTick()

      expect(vm.filteredRolls.map((r: any) => r.timesExposedToXrays)).toEqual([0, 1, 3])

      vm.setSort('timesExposedToXrays') // desc
      await wrapper.vm.$nextTick()
      expect(vm.filteredRolls.map((r: any) => r.timesExposedToXrays)).toEqual([3, 1, 0])
    })

    it('should sort chronologically by dateObtained', async () => {
      const wrapper = mount(RollsView, { global: { plugins: [router] } })
      await flushPromises()

      const vm = wrapper.vm as any
      vm.setSort('dateObtained')
      await wrapper.vm.$nextTick()

      // Compare timestamps to avoid timezone-dependent string formatting
      const timestamps = vm.filteredRolls.map((r: any) => new Date(r.dateObtained).getTime())
      expect(timestamps).toEqual([...timestamps].sort((a: number, b: number) => a - b))

      vm.setSort('dateObtained') // desc
      await wrapper.vm.$nextTick()
      const timestampsDesc = vm.filteredRolls.map((r: any) => new Date(r.dateObtained).getTime())
      expect(timestampsDesc).toEqual([...timestampsDesc].sort((a: number, b: number) => b - a))
    })

    it('should apply darker background on the active sort column header', async () => {
      const wrapper = mount(RollsView, { global: { plugins: [router] } })
      await flushPromises()

      const vm = wrapper.vm as any
      vm.setSort('state')
      await wrapper.vm.$nextTick()

      const headers = wrapper.findAll('th')
      expect(headers[1].classes()).toContain('bg-gray-200')
      expect(headers[0].classes()).not.toContain('bg-gray-200')
    })

    it('should show sort direction indicator next to the active column', async () => {
      const wrapper = mount(RollsView, { global: { plugins: [router] } })
      await flushPromises()

      // Default: rollId asc
      expect(wrapper.findAll('th')[0].text()).toContain('↑')
      expect(wrapper.findAll('th')[1].text()).not.toMatch(/[↑↓]/)

      const vm = wrapper.vm as any
      vm.setSort('rollId') // flip to desc
      await wrapper.vm.$nextTick()

      expect(wrapper.findAll('th')[0].text()).toContain('↓')
    })
  })

  describe('load modal', () => {
    it('should open load modal when Load button is clicked', async () => {
      vi.mocked(rollApi.getAll).mockResolvedValue({
        data: [makeRoll('r1', RollState.SHELFED)],
      } as any)

      const wrapper = mount(RollsView, { global: { plugins: [router] } })
      await flushPromises()

      const vm = wrapper.vm as any
      vm.openLoadModal(makeRoll('r1', RollState.SHELFED))
      await wrapper.vm.$nextTick()

      expect(vm.loadTarget).not.toBeNull()
      expect(wrapper.text()).toContain('What will this roll be loaded into?')
    })

    it('should close load modal on cancel', async () => {
      const wrapper = mount(RollsView, { global: { plugins: [router] } })
      await flushPromises()

      const vm = wrapper.vm as any
      vm.openLoadModal(makeRoll('r1', RollState.SHELFED))
      vm.closeLoadModal()
      await wrapper.vm.$nextTick()

      expect(vm.loadTarget).toBeNull()
    })

    it('should call rollApi.update with Loaded state and loadedInto on submit', async () => {
      vi.mocked(rollApi.update).mockResolvedValue({ data: {} } as any)

      const wrapper = mount(RollsView, { global: { plugins: [router] } })
      await flushPromises()

      const vm = wrapper.vm as any
      vm.openLoadModal(makeRoll('r1', RollState.SHELFED))
      vm.loadedInto = 'Nikon F3'

      await vm.handleLoad()
      await flushPromises()

      expect(rollApi.update).toHaveBeenCalledWith('r1', {
        state: RollState.LOADED,
        loadedInto: 'Nikon F3',
      })
    })

    it('should close modal and reload rolls after successful load', async () => {
      vi.mocked(rollApi.update).mockResolvedValue({ data: {} } as any)

      const wrapper = mount(RollsView, { global: { plugins: [router] } })
      await flushPromises()

      const vm = wrapper.vm as any
      vm.openLoadModal(makeRoll('r1', RollState.SHELFED))
      vm.loadedInto = 'Nikon F3'

      await vm.handleLoad()
      await flushPromises()

      expect(vm.loadTarget).toBeNull()
      expect(rollApi.getAll).toHaveBeenCalledTimes(2)
    })
  })
})
