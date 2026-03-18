// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import RollDetailView from '@/views/RollDetailView.vue'
import { rollApi, rollStateApi, rollTagApi, tagApi } from '@/services/api-client'
import { RollState } from '@/types'
import type { Roll, RollStateHistory, Tag, RollTag } from '@/types'

vi.mock('@/services/api-client', () => ({
  rollApi: {
    getById: vi.fn(),
    transition: vi.fn(),
  },
  rollStateApi: {
    getHistory: vi.fn(),
  },
  rollTagApi: {
    getAll: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
  tagApi: {
    getAll: vi.fn(),
  },
}))

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/rolls', name: 'rolls', component: { template: '<div/>' } },
    { path: '/rolls/:key', name: 'roll-detail', component: RollDetailView },
  ],
})

const makeRoll = (overrides: Partial<Roll> = {}): Roll => ({
  _key: 'r1',
  rollId: 'roll-00001',
  stockKey: 'stock1',
  state: RollState.SHELVED,
  dateObtained: new Date('2024-01-15'),
  obtainmentMethod: 'Purchase' as any,
  obtainedFrom: 'B&H',
  timesExposedToXrays: 0,
  ...overrides,
} as Roll)

const makeHistory = (entries: Partial<RollStateHistory>[]): RollStateHistory[] =>
  entries.map((e, i) => ({
    stateId: `state-${i}`,
    rollKey: 'r1',
    state: RollState.ADDED,
    date: new Date(`2024-01-${String(i + 1).padStart(2, '0')}`),
    notes: undefined,
    ...e,
  } as RollStateHistory))

const makeTag = (key: string, value: string, isRollScoped = true, color = '#ff0000'): Tag => ({
  _key: key,
  value,
  color,
  isRollScoped,
  isStockScoped: false,
  createdAt: new Date(),
})

const makeRollTag = (key: string, tagKey: string): RollTag => ({
  _key: key,
  rollKey: 'r1',
  tagKey,
  createdAt: new Date(),
})

const mountView = async (rollKey = 'r1') => {
  await router.push(`/rolls/${rollKey}`)
  await router.isReady()
  const wrapper = mount(RollDetailView, { global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

describe('RollDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(rollApi.getById).mockResolvedValue({ data: makeRoll() } as any)
    vi.mocked(rollStateApi.getHistory).mockResolvedValue({ data: [] } as any)
    vi.mocked(tagApi.getAll).mockResolvedValue({ data: [] } as any)
    vi.mocked(rollTagApi.getAll).mockResolvedValue({ data: [] } as any)
    vi.mocked(rollApi.transition).mockResolvedValue({ data: makeRoll() } as any)
    vi.mocked(rollTagApi.create).mockResolvedValue({ data: makeRollTag('rt-new', 't1') } as any)
    vi.mocked(rollTagApi.delete).mockResolvedValue({} as any)
  })

  describe('data loading', () => {
    it('should show loading state initially', () => {
      vi.mocked(rollApi.getById).mockReturnValue(new Promise(() => {}) as any)
      const wrapper = mount(RollDetailView, { global: { plugins: [router] } })
      expect(wrapper.text()).toContain('Loading...')
    })

    it('should display roll ID as heading', async () => {
      const wrapper = await mountView()
      expect(wrapper.find('h1').text()).toBe('roll-00001')
    })

    it('should display roll state as badge', async () => {
      const wrapper = await mountView()
      expect(wrapper.text()).toContain('Shelved')
    })

    it('should display obtained from in details', async () => {
      const wrapper = await mountView()
      expect(wrapper.text()).toContain('B&H')
    })

    it('should show not found when roll is missing', async () => {
      vi.mocked(rollApi.getById).mockResolvedValue({ data: null } as any)
      const wrapper = await mountView()
      expect(wrapper.text()).toContain('Roll not found')
    })

    it('should show no history message when history is empty', async () => {
      const wrapper = await mountView()
      expect(wrapper.text()).toContain('No history recorded yet')
    })
  })

  describe('transition history direction annotation', () => {
    it('should mark first entry as initial', async () => {
      vi.mocked(rollStateApi.getHistory).mockResolvedValue({
        data: makeHistory([{ state: RollState.ADDED, date: new Date('2024-01-01') }]),
      } as any)
      const wrapper = await mountView()
      expect(wrapper.text()).toContain('initial')
    })

    it('should classify forward transitions correctly', async () => {
      vi.mocked(rollStateApi.getHistory).mockResolvedValue({
        data: makeHistory([
          { state: RollState.ADDED, date: new Date('2024-01-01') },
          { state: RollState.SHELVED, date: new Date('2024-01-02') },
        ]),
      } as any)
      const wrapper = await mountView()
      // No "correction" label means forward transition
      expect(wrapper.text()).not.toContain('correction')
    })

    it('should label backward transitions as "↩ backward" when not an error correction', async () => {
      vi.mocked(rollApi.getById).mockResolvedValue({ data: makeRoll({ state: RollState.ADDED }) } as any)
      vi.mocked(rollStateApi.getHistory).mockResolvedValue({
        data: makeHistory([
          { state: RollState.ADDED, date: new Date('2024-01-01') },
          { state: RollState.FROZEN, date: new Date('2024-01-02') },
          { state: RollState.ADDED, date: new Date('2024-01-03') },
        ]),
      } as any)
      const wrapper = await mountView()
      expect(wrapper.text()).toContain('↩ backward')
    })

    it('should label backward transitions as "↩ error correction" when isErrorCorrection is true', async () => {
      vi.mocked(rollApi.getById).mockResolvedValue({ data: makeRoll({ state: RollState.ADDED }) } as any)
      vi.mocked(rollStateApi.getHistory).mockResolvedValue({
        data: makeHistory([
          { state: RollState.ADDED, date: new Date('2024-01-01') },
          { state: RollState.FROZEN, date: new Date('2024-01-02') },
          { state: RollState.ADDED, date: new Date('2024-01-03'), isErrorCorrection: true } as any,
        ]),
      } as any)
      const wrapper = await mountView()
      expect(wrapper.text()).toContain('↩ error correction')
    })

    it('should display history newest first', async () => {
      vi.mocked(rollStateApi.getHistory).mockResolvedValue({
        data: makeHistory([
          { state: RollState.ADDED, date: new Date('2024-01-01') },
          { state: RollState.FROZEN, date: new Date('2024-01-02') },
          { state: RollState.SHELVED, date: new Date('2024-01-03') },
        ]),
      } as any)
      const wrapper = await mountView()
      const badges = wrapper.findAll('ol li span.rounded-full')
      expect(badges[0].text()).toBe('Shelved')
      expect(badges[badges.length - 1].text()).toBe('Added')
    })
  })

  describe('transitions', () => {
    it('should show forward transition buttons for current state', async () => {
      vi.mocked(rollApi.getById).mockResolvedValue({ data: makeRoll({ state: RollState.SHELVED }) } as any)
      const wrapper = await mountView()
      expect(wrapper.text()).toContain('Loaded')
    })

    it('should show backward transition buttons with ↩ prefix', async () => {
      vi.mocked(rollApi.getById).mockResolvedValue({ data: makeRoll({ state: RollState.SHELVED }) } as any)
      const wrapper = await mountView()
      // SHELVED can go back to REFRIGERATED and FROZEN
      const buttons = wrapper.findAll('button')
      const backwardBtn = buttons.find(b => b.text().startsWith('↩'))
      expect(backwardBtn).toBeTruthy()
    })

    it('should show backward transitions for RECEIVED state', async () => {
      vi.mocked(rollApi.getById).mockResolvedValue({ data: makeRoll({ state: RollState.RECEIVED }) } as any)
      const wrapper = await mountView()
      expect(wrapper.text()).toContain('Transitions')
      const buttons = wrapper.findAll('button')
      const backwardBtn = buttons.find(b => b.text().startsWith('↩'))
      expect(backwardBtn).toBeTruthy()
    })

    it('should show metadata form when clicking FROZEN from ADDED', async () => {
      vi.mocked(rollApi.getById).mockResolvedValue({ data: makeRoll({ state: RollState.ADDED }) } as any)
      const wrapper = await mountView()

      const buttons = wrapper.findAll('button')
      const frozenBtn = buttons.find(b => b.text() === 'Frozen')
      await frozenBtn!.trigger('click')
      await flushPromises()

      expect(wrapper.text()).toContain('Frozen details')
      expect(wrapper.find('input[type="number"]').exists()).toBe(true)
      expect(rollApi.transition).not.toHaveBeenCalled()
    })

    it('should call transition with temperature metadata when metadata form is confirmed', async () => {
      vi.mocked(rollApi.getById).mockResolvedValue({ data: makeRoll({ state: RollState.ADDED }) } as any)
      const wrapper = await mountView()

      const buttons = wrapper.findAll('button')
      const frozenBtn = buttons.find(b => b.text() === 'Frozen')
      await frozenBtn!.trigger('click')
      await flushPromises()

      const input = wrapper.find('input[type="number"]')
      await input.setValue('-20')

      const confirmBtn = wrapper.findAll('button').find(b => b.text() === 'Confirm')
      await confirmBtn!.trigger('click')
      await flushPromises()

      expect(rollApi.transition).toHaveBeenCalledWith(
        'r1', RollState.FROZEN, undefined, undefined, { temperature: -20 },
      )
    })

    it('should call transition with no metadata when temperature is cleared', async () => {
      vi.mocked(rollApi.getById).mockResolvedValue({ data: makeRoll({ state: RollState.ADDED }) } as any)
      const wrapper = await mountView()

      const buttons = wrapper.findAll('button')
      const frozenBtn = buttons.find(b => b.text() === 'Frozen')
      await frozenBtn!.trigger('click')
      await flushPromises()

      const input = wrapper.find('input[type="number"]')
      await input.setValue('')

      const confirmBtn = wrapper.findAll('button').find(b => b.text() === 'Confirm')
      await confirmBtn!.trigger('click')
      await flushPromises()

      expect(rollApi.transition).toHaveBeenCalledWith(
        'r1', RollState.FROZEN, undefined, undefined, undefined,
      )
    })

    it('should show shot ISO field (not temperature) when clicking Finished', async () => {
      vi.mocked(rollApi.getById).mockResolvedValue({ data: makeRoll({ state: RollState.LOADED }) } as any)
      const wrapper = await mountView()

      const buttons = wrapper.findAll('button')
      const finishedBtn = buttons.find(b => b.text() === 'Finished')
      await finishedBtn!.trigger('click')
      await flushPromises()

      expect(wrapper.text()).toContain('Shot ISO')
      expect(wrapper.text()).not.toContain('temperature')
      expect(rollApi.transition).not.toHaveBeenCalled()
    })

    it('should include shotISO in metadata when confirming FINISHED', async () => {
      vi.mocked(rollApi.getById).mockResolvedValue({ data: makeRoll({ state: RollState.LOADED }) } as any)
      const wrapper = await mountView()

      const buttons = wrapper.findAll('button')
      const finishedBtn = buttons.find(b => b.text() === 'Finished')
      await finishedBtn!.trigger('click')
      await flushPromises()

      const input = wrapper.find('input[type="number"]')
      await input.setValue('800')

      const confirmBtn = wrapper.findAll('button').find(b => b.text() === 'Confirm')
      await confirmBtn!.trigger('click')
      await flushPromises()

      expect(rollApi.transition).toHaveBeenCalledWith(
        'r1', RollState.FINISHED, undefined, undefined, { shotISO: 800 },
      )
    })

    it('should transition FINISHED with no metadata when shotISO is left blank', async () => {
      vi.mocked(rollApi.getById).mockResolvedValue({ data: makeRoll({ state: RollState.LOADED }) } as any)
      const wrapper = await mountView()

      const buttons = wrapper.findAll('button')
      const finishedBtn = buttons.find(b => b.text() === 'Finished')
      await finishedBtn!.trigger('click')
      await flushPromises()

      const confirmBtn = wrapper.findAll('button').find(b => b.text() === 'Confirm')
      await confirmBtn!.trigger('click')
      await flushPromises()

      expect(rollApi.transition).toHaveBeenCalledWith(
        'r1', RollState.FINISHED, undefined, undefined, undefined,
      )
    })

    it('should show lab form when clicking Sent For Development', async () => {
      vi.mocked(rollApi.getById).mockResolvedValue({ data: makeRoll({ state: RollState.FINISHED }) } as any)
      const wrapper = await mountView()

      const buttons = wrapper.findAll('button')
      const sentBtn = buttons.find(b => b.text() === 'Sent For Development')
      await sentBtn!.trigger('click')
      await flushPromises()

      expect(wrapper.text()).toContain('Lab name')
      expect(wrapper.text()).toContain('Delivery method')
      expect(wrapper.text()).toContain('Process requested')
      expect(rollApi.transition).not.toHaveBeenCalled()
    })

    it('should show validation error when required lab fields are missing', async () => {
      vi.mocked(rollApi.getById).mockResolvedValue({ data: makeRoll({ state: RollState.FINISHED }) } as any)
      const wrapper = await mountView()

      const buttons = wrapper.findAll('button')
      const sentBtn = buttons.find(b => b.text() === 'Sent For Development')
      await sentBtn!.trigger('click')
      await flushPromises()

      const confirmBtn = wrapper.findAll('button').find(b => b.text() === 'Confirm')
      await confirmBtn!.trigger('click')
      await flushPromises()

      expect(wrapper.text()).toContain('required')
      expect(rollApi.transition).not.toHaveBeenCalled()
    })

    it('should call transition with lab metadata when all required fields are filled', async () => {
      vi.mocked(rollApi.getById).mockResolvedValue({ data: makeRoll({ state: RollState.FINISHED }) } as any)
      const wrapper = await mountView()

      const buttons = wrapper.findAll('button')
      const sentBtn = buttons.find(b => b.text() === 'Sent For Development')
      await sentBtn!.trigger('click')
      await flushPromises()

      const vm = wrapper.vm as any
      vm.metadataLabName = 'The Darkroom'
      vm.metadataDeliveryMethod = 'Mail in'
      vm.metadataProcessRequested = 'C-41'
      await wrapper.vm.$nextTick()

      const confirmBtn = wrapper.findAll('button').find(b => b.text() === 'Confirm')
      await confirmBtn!.trigger('click')
      await flushPromises()

      expect(rollApi.transition).toHaveBeenCalledWith(
        'r1', RollState.SENT_FOR_DEVELOPMENT, undefined, undefined,
        expect.objectContaining({ labName: 'The Darkroom', deliveryMethod: 'Mail in', processRequested: 'C-41' }),
      )
    })

    it('should dismiss metadata form without transitioning when Cancel is clicked', async () => {
      vi.mocked(rollApi.getById).mockResolvedValue({ data: makeRoll({ state: RollState.ADDED }) } as any)
      const wrapper = await mountView()

      const buttons = wrapper.findAll('button')
      const frozenBtn = buttons.find(b => b.text() === 'Frozen')
      await frozenBtn!.trigger('click')
      await flushPromises()

      const cancelBtn = wrapper.findAll('button').find(b => b.text() === 'Cancel')
      await cancelBtn!.trigger('click')
      await flushPromises()

      expect(rollApi.transition).not.toHaveBeenCalled()
      expect(wrapper.text()).not.toContain('Frozen details')
    })

    it('should call rollApi.transition and reload on forward transition click', async () => {
      vi.mocked(rollApi.getById).mockResolvedValue({ data: makeRoll({ state: RollState.SHELVED }) } as any)
      const wrapper = await mountView()

      const buttons = wrapper.findAll('button')
      const loadedBtn = buttons.find(b => b.text() === 'Loaded')
      await loadedBtn!.trigger('click')
      await flushPromises()

      expect(rollApi.transition).toHaveBeenCalledWith('r1', RollState.LOADED, undefined, undefined, undefined)
      expect(rollApi.getById).toHaveBeenCalledTimes(2)
    })

    it('should show error correction prompt when backward transition is clicked', async () => {
      vi.mocked(rollApi.getById).mockResolvedValue({ data: makeRoll({ state: RollState.SHELVED }) } as any)
      const wrapper = await mountView()

      const buttons = wrapper.findAll('button')
      const backwardBtn = buttons.find(b => b.text().startsWith('↩'))
      await backwardBtn!.trigger('click')
      await flushPromises()

      expect(wrapper.text()).toContain('Was this done to correct an error?')
      expect(rollApi.transition).not.toHaveBeenCalled()
    })

    it('should call transition with isErrorCorrection=true when Yes is clicked', async () => {
      vi.mocked(rollApi.getById).mockResolvedValue({ data: makeRoll({ state: RollState.SHELVED }) } as any)
      const wrapper = await mountView()

      const buttons = wrapper.findAll('button')
      const backwardBtn = buttons.find(b => b.text().startsWith('↩'))
      await backwardBtn!.trigger('click')
      await flushPromises()

      const yesBtn = wrapper.findAll('button').find(b => b.text() === 'Yes')
      await yesBtn!.trigger('click')
      await flushPromises()

      expect(rollApi.transition).toHaveBeenCalledWith('r1', expect.any(String), undefined, true, undefined)
    })

    it('should call transition with isErrorCorrection=false when No is clicked', async () => {
      vi.mocked(rollApi.getById).mockResolvedValue({ data: makeRoll({ state: RollState.SHELVED }) } as any)
      const wrapper = await mountView()

      const buttons = wrapper.findAll('button')
      const backwardBtn = buttons.find(b => b.text().startsWith('↩'))
      await backwardBtn!.trigger('click')
      await flushPromises()

      const noBtn = wrapper.findAll('button').find(b => b.text() === 'No')
      await noBtn!.trigger('click')
      await flushPromises()

      expect(rollApi.transition).toHaveBeenCalledWith('r1', expect.any(String), undefined, false, undefined)
    })

    it('should dismiss the prompt without transitioning when Cancel is clicked', async () => {
      vi.mocked(rollApi.getById).mockResolvedValue({ data: makeRoll({ state: RollState.SHELVED }) } as any)
      const wrapper = await mountView()

      const buttons = wrapper.findAll('button')
      const backwardBtn = buttons.find(b => b.text().startsWith('↩'))
      await backwardBtn!.trigger('click')
      await flushPromises()

      const cancelBtn = wrapper.findAll('button').find(b => b.text() === 'Cancel')
      await cancelBtn!.trigger('click')
      await flushPromises()

      expect(rollApi.transition).not.toHaveBeenCalled()
      expect(wrapper.text()).not.toContain('Was this done to correct an error?')
    })
  })

  describe('tags', () => {
    it('should show "No tags yet" when no tags are assigned', async () => {
      const wrapper = await mountView()
      expect(wrapper.text()).toContain('No tags yet')
    })

    it('should display assigned tags as chips', async () => {
      vi.mocked(tagApi.getAll).mockResolvedValue({
        data: [makeTag('t1', 'expired'), makeTag('t2', 'pushed')],
      } as any)
      vi.mocked(rollTagApi.getAll).mockResolvedValue({
        data: [makeRollTag('rt1', 't1')],
      } as any)
      const wrapper = await mountView()
      expect(wrapper.text()).toContain('expired')
    })

    it('should only show roll-scoped tags in available tags', async () => {
      vi.mocked(tagApi.getAll).mockResolvedValue({
        data: [
          makeTag('t1', 'roll-tag', true),
          makeTag('t2', 'stock-only-tag', false),
        ],
      } as any)
      const wrapper = await mountView()
      const vm = wrapper.vm as any
      expect(vm.availableTags.map((t: Tag) => t.value)).toContain('roll-tag')
      expect(vm.availableTags.map((t: Tag) => t.value)).not.toContain('stock-only-tag')
    })

    it('should not show already-assigned tags in available tags', async () => {
      vi.mocked(tagApi.getAll).mockResolvedValue({
        data: [makeTag('t1', 'expired'), makeTag('t2', 'pushed')],
      } as any)
      vi.mocked(rollTagApi.getAll).mockResolvedValue({
        data: [makeRollTag('rt1', 't1')],
      } as any)
      const wrapper = await mountView()
      const vm = wrapper.vm as any
      expect(vm.availableTags.map((t: Tag) => t._key)).not.toContain('t1')
      expect(vm.availableTags.map((t: Tag) => t._key)).toContain('t2')
    })

    it('should call rollTagApi.create and reload when adding a tag', async () => {
      vi.mocked(tagApi.getAll).mockResolvedValue({
        data: [makeTag('t1', 'expired')],
      } as any)
      const wrapper = await mountView()
      const vm = wrapper.vm as any
      await vm.addTag({ _key: 't1', value: 'expired' })
      await flushPromises()

      expect(rollTagApi.create).toHaveBeenCalledWith({ rollKey: 'r1', tagKey: 't1' })
      expect(rollTagApi.getAll).toHaveBeenCalledTimes(2)
    })

    it('should call rollTagApi.delete and reload when removing a tag', async () => {
      vi.mocked(tagApi.getAll).mockResolvedValue({
        data: [makeTag('t1', 'expired')],
      } as any)
      vi.mocked(rollTagApi.getAll).mockResolvedValue({
        data: [makeRollTag('rt1', 't1')],
      } as any)
      const wrapper = await mountView()
      const vm = wrapper.vm as any
      await vm.removeTag('rt1')
      await flushPromises()

      expect(rollTagApi.delete).toHaveBeenCalledWith('rt1')
      expect(rollTagApi.getAll).toHaveBeenCalledTimes(2)
    })
  })

  describe('navigation', () => {
    it('should navigate back to rolls list when back button is clicked', async () => {
      const wrapper = await mountView()
      const backBtn = wrapper.find('button')
      await backBtn.trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.name).toBe('rolls')
    })
  })
})
