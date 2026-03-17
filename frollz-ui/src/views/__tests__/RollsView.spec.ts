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

const makeRoll = (key: string, state: RollState) => ({
  _key: key,
  rollId: `roll-${key}`,
  stockKey: 'stock1',
  state,
  dateObtained: new Date('2024-01-01'),
  obtainmentMethod: ObtainmentMethod.PURCHASE,
  obtainedFrom: 'B&H',
  timesExposedToXrays: 0,
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

    it('should use "Shelved" in the filter dropdown', async () => {
      const wrapper = mount(RollsView, { global: { plugins: [router] } })
      await flushPromises()

      const options = wrapper.findAll('option')
      const labels = options.map(o => o.text())
      expect(labels).toContain('Shelved')
      expect(labels).not.toContain('Shelfed')
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
