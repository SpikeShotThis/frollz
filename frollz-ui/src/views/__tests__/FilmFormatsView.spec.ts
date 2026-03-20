// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { axe } from 'vitest-axe'
import FilmFormatsView from '@/views/FilmFormatsView.vue'
import { filmFormatApi } from '@/services/api-client'

const axeOptions = {
  runOnly: { type: 'tag' as const, values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
}

vi.mock('@/services/api-client', () => ({
  filmFormatApi: {
    getAll: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('FilmFormatsView', () => {
  const mockFormats = [
    { _key: '35mm-roll', format: '35mm', formFactor: 'Roll', createdAt: new Date('2024-01-01') },
    { _key: '120-roll', format: '120', formFactor: 'Roll', createdAt: new Date('2024-02-01') },
    { _key: '4x5-sheet', format: '4x5', formFactor: 'Sheet', createdAt: new Date('2024-03-01') },
  ]

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.mocked(filmFormatApi.getAll).mockResolvedValue({ data: mockFormats } as any)
    vi.mocked(filmFormatApi.create).mockResolvedValue({ data: mockFormats[0] } as any)
    vi.mocked(filmFormatApi.delete).mockResolvedValue({} as any)
  })

  describe('accessibility', () => {
    it('renders the format list without a11y violations', async () => {
      const wrapper = mount(FilmFormatsView)
      await flushPromises()

      const results = await axe(wrapper.element, axeOptions)
      expect(results).toHaveNoViolations()
    })

    it('renders the Add Film Format modal without a11y violations', async () => {
      const wrapper = mount(FilmFormatsView)
      await flushPromises()

      const vm = wrapper.vm as any
      vm.showCreateForm = true
      await wrapper.vm.$nextTick()

      const results = await axe(wrapper.element, axeOptions)
      expect(results).toHaveNoViolations()
    })
  })

  describe('component mounting', () => {
    it('should load and display formats on mount', async () => {
      const wrapper = mount(FilmFormatsView)
      await flushPromises()

      expect(filmFormatApi.getAll).toHaveBeenCalled()
      expect(wrapper.text()).toContain('35mm')
      expect(wrapper.text()).toContain('120')
      expect(wrapper.text()).toContain('4x5')
    })

    it('should show empty state when no formats exist', async () => {
      vi.mocked(filmFormatApi.getAll).mockResolvedValue({ data: [] } as any)

      const wrapper = mount(FilmFormatsView)
      await flushPromises()

      expect(wrapper.text()).toContain('No formats found.')
    })
  })

  describe('create format', () => {
    it('should show the modal when Add Format button is clicked', async () => {
      const wrapper = mount(FilmFormatsView)
      await flushPromises()

      const addBtn = wrapper.find('button')
      await addBtn.trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('Add Film Format')
    })

    it('should call filmFormatApi.create and reload on form submit', async () => {
      vi.mocked(filmFormatApi.getAll).mockResolvedValue({ data: [] } as any)

      const wrapper = mount(FilmFormatsView)
      await flushPromises()

      const vm = wrapper.vm as any
      vm.showCreateForm = true
      vm.newFormat = { formFactor: 'Roll', format: '35mm' }
      await wrapper.vm.$nextTick()

      await vm.createFormat()
      await flushPromises()

      expect(filmFormatApi.create).toHaveBeenCalledWith({ formFactor: 'Roll', format: '35mm' })
      expect(filmFormatApi.getAll).toHaveBeenCalledTimes(2)
    })

    it('should close modal and reset form after successful create', async () => {
      const wrapper = mount(FilmFormatsView)
      await flushPromises()

      const vm = wrapper.vm as any
      vm.showCreateForm = true
      vm.newFormat = { formFactor: 'Roll', format: '120' }
      await vm.createFormat()
      await flushPromises()

      expect(vm.showCreateForm).toBe(false)
      expect(vm.newFormat.formFactor).toBe('')
      expect(vm.newFormat.format).toBe('')
    })

    it('should show error message when create fails', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(filmFormatApi.create).mockRejectedValue(new Error('Server error'))

      const wrapper = mount(FilmFormatsView)
      await flushPromises()

      const vm = wrapper.vm as any
      vm.showCreateForm = true
      vm.newFormat = { formFactor: 'Roll', format: '35mm' }
      await wrapper.vm.$nextTick()

      await vm.createFormat()
      await flushPromises()

      expect(vm.createError).toBeTruthy()
      expect(vm.showCreateForm).toBe(true)
    })
  })

  describe('delete format', () => {
    it('should call filmFormatApi.delete and reload after confirmation', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true)

      const wrapper = mount(FilmFormatsView)
      await flushPromises()

      const vm = wrapper.vm as any
      await vm.deleteFormat('35mm-roll')
      await flushPromises()

      expect(filmFormatApi.delete).toHaveBeenCalledWith('35mm-roll')
      expect(filmFormatApi.getAll).toHaveBeenCalledTimes(2)
    })

    it('should not delete when confirm is cancelled', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false)

      const wrapper = mount(FilmFormatsView)
      await flushPromises()

      const vm = wrapper.vm as any
      await vm.deleteFormat('35mm-roll')
      await flushPromises()

      expect(filmFormatApi.delete).not.toHaveBeenCalled()
    })
  })
})
