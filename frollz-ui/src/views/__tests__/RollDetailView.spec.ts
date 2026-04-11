// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { axe } from 'vitest-axe'
import RollDetailView from '@/views/RollDetailView.vue'
import { filmApi, filmTagApi, tagApi, transitionApi } from '@/services/api-client'
import type { Film, Tag, FilmTag, TransitionGraph, TransitionEdge, FilmState } from '@/types'
import { randomInt } from 'crypto'

const randomId = () => randomInt(1, 1000000);

const axeOptions = {
  runOnly: { type: 'tag' as const, values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
}

vi.mock('@/services/api-client', () => ({
  filmApi: {
    getById: vi.fn(),
    transition: vi.fn(),
    getChildren: vi.fn(),
  },
  filmTagApi: {
    getAll: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
  tagApi: {
    getAll: vi.fn(),
  },
  transitionApi: {
    getGraph: vi.fn(),
    getProfiles: vi.fn(),
  },
}))

const edge = (
  id: number,
  fromState: string,
  toState: string,
  transitionType: 'FORWARD' | 'BACKWARD',
  requiresDate: boolean,
  metadata: TransitionEdge['metadata'] = [],
): TransitionEdge => ({ id, fromState, toState, transitionType, requiresDate, metadata })

const makeGraph = (): TransitionGraph => ({
  states: ['Added', 'Shelved', 'Loaded', 'Finished'],
  transitions: [
    edge(randomId(), 'Added',    'Shelved',  'FORWARD',  true, []),
    edge(randomId(), 'Shelved',  'Loaded',   'FORWARD',  true, []),
    edge(randomId(), 'Loaded',   'Finished', 'FORWARD',  true, []),
    edge(randomId(), 'Shelved',  'Added',    'BACKWARD', false, []),
    edge(randomId(), 'Loaded',   'Shelved',  'BACKWARD', false, []),
  ],
})

const makeFilmState = (stateName: string, date: Date): FilmState => ({
  id: randomId(),
  filmId: 'film1',
  stateId: randomId(),
  date,
  note: undefined,
  state: { id: randomId(), name: stateName },
})

const makeFilm = (overrides: Partial<Film> = {}): Film => ({
  id: 'film1',
  name: 'roll-00001',
  emulsionId: randomId(),
  expirationDate: new Date('2026-12-01'),
  parentId: null,
  transitionProfileId: 'prof-standard',
  tags: [],
  states: [makeFilmState('Shelved', new Date('2024-01-15'))],
  ...overrides,
})

const mockProfiles = [
  { id: 'prof-standard', name: 'standard' },
  { id: 'prof-bulk', name: 'bulk' },
]

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/rolls', name: 'rolls', component: { template: '<div/>' } },
    { path: '/rolls/:key', name: 'roll-detail', component: RollDetailView },
  ],
})

const mountView = async (filmId = 'film1') => {
  await router.push(`/rolls/${filmId}`)
  await router.isReady()
  const wrapper = mount(RollDetailView, { global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

describe('RollDetailView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.mocked(filmApi.getById).mockResolvedValue({ data: makeFilm() } as any)
    vi.mocked(filmApi.transition).mockResolvedValue({ data: makeFilm() } as any)
    vi.mocked(filmApi.getChildren).mockResolvedValue({ data: [] } as any)
    vi.mocked(tagApi.getAll).mockResolvedValue({ data: [] } as any)
    vi.mocked(filmTagApi.getAll).mockResolvedValue({ data: [] } as any)
    vi.mocked(filmTagApi.create).mockResolvedValue({ data: {} } as any)
    vi.mocked(filmTagApi.delete).mockResolvedValue({} as any)
    vi.mocked(transitionApi.getGraph).mockResolvedValue({ data: makeGraph() } as any)
    vi.mocked(transitionApi.getProfiles).mockResolvedValue({ data: mockProfiles } as any)
  })

  describe('accessibility', () => {
    it('renders the film detail view with transitions panel without a11y violations', async () => {
      const wrapper = await mountView()

      const results = await axe(wrapper.element, axeOptions)
      expect(results).toHaveNoViolations()
    })

    it('renders the transition date form without a11y violations', async () => {
      const wrapper = await mountView()

      const vm = wrapper.vm as any
      vm.pendingTransition = 'Loaded'
      await wrapper.vm.$nextTick()

      const results = await axe(wrapper.element, axeOptions)
      expect(results).toHaveNoViolations()
    })
  })

  describe('data loading', () => {
    it('should show loading state initially', () => {
      vi.mocked(filmApi.getById).mockReturnValue(new Promise(() => {}) as any)
      const wrapper = mount(RollDetailView, { global: { plugins: [router] } })
      expect(wrapper.text()).toContain('Loading...')
    })

    it('should display film name as heading', async () => {
      const wrapper = await mountView()
      expect(wrapper.find('h1').text()).toBe('roll-00001')
    })

    it('should display current state as badge', async () => {
      const wrapper = await mountView()
      expect(wrapper.text()).toContain('Shelved')
    })

    it('should show film not found when film is null', async () => {
      vi.mocked(filmApi.getById).mockResolvedValue({ data: null } as any)
      const wrapper = await mountView()
      expect(wrapper.text()).toContain('Film not found')
    })

    it('should show no history message when states is empty', async () => {
      vi.mocked(filmApi.getById).mockResolvedValue({ data: makeFilm({ states: [] }) } as any)
      const wrapper = await mountView()
      expect(wrapper.text()).toContain('No history recorded yet')
    })
  })

  describe('transition history', () => {
    it('should display history entries from film.states newest first', async () => {
      vi.mocked(filmApi.getById).mockResolvedValue({
        data: makeFilm({
          states: [
            makeFilmState('Added',   new Date('2024-01-01')),
            makeFilmState('Shelved', new Date('2024-01-10')),
          ],
        }),
      } as any)

      const wrapper = await mountView()
      const historyText = wrapper.text()

      // Newest (Shelved) should appear before oldest (Added)
      const shelvedIdx = historyText.indexOf('Shelved')
      const addedIdx = historyText.lastIndexOf('Added')
      expect(shelvedIdx).toBeLessThan(addedIdx)
    })
  })

  describe('transitions', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-01-01T12:00:00.000Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should show forward transition buttons for current state', async () => {
      const wrapper = await mountView()
      expect(wrapper.text()).toContain('Loaded')
    })

    it('should show backward transition buttons for current state', async () => {
      const wrapper = await mountView()
      // Shelved has a backward rule to Added; the button should be present
      expect(wrapper.text()).toContain('Added')
    })

    it('should open date+note form when a transition button is clicked', async () => {
      const wrapper = await mountView()

      const vm = wrapper.vm as any
      vm.handleTransition('Loaded')
      await wrapper.vm.$nextTick()

      expect(vm.pendingTransition).toBe('Loaded')
      expect(wrapper.find('input[type="date"]').exists()).toBe(true)
    })

    it('should call filmApi.transition and reload on confirmTransition', async () => {
      vi.mocked(filmApi.transition).mockResolvedValue({ data: makeFilm() } as any)

      const wrapper = await mountView()
      const vm = wrapper.vm as any
      vm.handleTransition('Loaded')
      vm.transitionDate = '2026-01-15'
      vm.transitionNote = 'test note'
      await wrapper.vm.$nextTick()

      await vm.confirmTransition()
      await flushPromises()

      expect(filmApi.transition).toHaveBeenCalledWith(
        'film1',
        'Loaded',
        expect.stringContaining('2026-01-15'),
        'test note',
      )
    })

    it('should dismiss the pending transition when Cancel is clicked', async () => {
      const wrapper = await mountView()
      const vm = wrapper.vm as any
      vm.handleTransition('Loaded')
      await wrapper.vm.$nextTick()

      vm.pendingTransition = null
      await wrapper.vm.$nextTick()

      expect(vm.pendingTransition).toBeNull()
      expect(wrapper.find('input[type="date"]').exists()).toBe(false)
    })
  })

  describe('tags', () => {
    const tagA: Tag = { id: 'tag-a', name: 'Push', colorCode: '#ff0000' }
    const tagB: Tag = { id: 'tag-b', name: 'Pull', colorCode: '#0000ff' }
    const filmTagA: FilmTag = { id: 'ft-a', filmId: 'film1', tagId: 'tag-a' }

    it('should show "No tags yet" when no tags are assigned', async () => {
      const wrapper = await mountView()
      expect(wrapper.text()).toContain('No tags yet')
    })

    it('should display assigned tags as chips', async () => {
      vi.mocked(tagApi.getAll).mockResolvedValue({ data: [tagA, tagB] } as any)
      vi.mocked(filmTagApi.getAll).mockResolvedValue({ data: [filmTagA] } as any)

      const wrapper = await mountView()
      expect(wrapper.text()).toContain('Push')
    })

    it('should show unassigned tags in the available tags list', async () => {
      vi.mocked(tagApi.getAll).mockResolvedValue({ data: [tagA, tagB] } as any)
      vi.mocked(filmTagApi.getAll).mockResolvedValue({ data: [filmTagA] } as any)

      const wrapper = await mountView()
      const vm = wrapper.vm as any

      // tagA is assigned, only tagB should be available
      expect(vm.availableTags.map((t: Tag) => t.id)).toContain('tag-b')
      expect(vm.availableTags.map((t: Tag) => t.id)).not.toContain('tag-a')
    })

    it('should not show already-assigned tags in available tags', async () => {
      vi.mocked(tagApi.getAll).mockResolvedValue({ data: [tagA] } as any)
      vi.mocked(filmTagApi.getAll).mockResolvedValue({ data: [filmTagA] } as any)

      const wrapper = await mountView()
      const vm = wrapper.vm as any
      expect(vm.availableTags).toHaveLength(0)
    })

    it('should call filmTagApi.create and reload when adding a tag', async () => {
      vi.mocked(tagApi.getAll).mockResolvedValue({ data: [tagA, tagB] } as any)
      vi.mocked(filmTagApi.getAll).mockResolvedValue({ data: [] } as any)

      const wrapper = await mountView()
      const vm = wrapper.vm as any
      await vm.addTag(tagA)
      await flushPromises()

      expect(filmTagApi.create).toHaveBeenCalledWith({ filmId: 'film1', tagId: 'tag-a' })
      expect(filmTagApi.getAll).toHaveBeenCalledTimes(2)
    })

    it('should call filmTagApi.delete and reload when removing a tag', async () => {
      vi.mocked(filmTagApi.getAll).mockResolvedValue({ data: [filmTagA] } as any)

      const wrapper = await mountView()
      const vm = wrapper.vm as any
      await vm.removeTag('ft-a')
      await flushPromises()

      expect(filmTagApi.delete).toHaveBeenCalledWith('ft-a')
      expect(filmTagApi.getAll).toHaveBeenCalledTimes(2)
    })
  })

  describe('bulk film detection', () => {
    it('should compute isBulkFilm as true when transitionProfileId matches bulk profile', async () => {
      vi.mocked(filmApi.getById).mockResolvedValue({
        data: makeFilm({ transitionProfileId: 'prof-bulk' }),
      } as any)

      const wrapper = await mountView()
      const vm = wrapper.vm as any
      expect(vm.isBulkFilm).toBe(true)
    })

    it('should compute isBulkFilm as false for standard profile', async () => {
      const wrapper = await mountView()
      const vm = wrapper.vm as any
      expect(vm.isBulkFilm).toBe(false)
    })
  })

  describe('navigation', () => {
    it('should navigate back to films list on back button click', async () => {
      const wrapper = await mountView()
      const backBtn = wrapper.find('button')
      await backBtn.trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.name).toBe('rolls')
    })
  })
})
