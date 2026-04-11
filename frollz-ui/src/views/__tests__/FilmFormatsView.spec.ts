// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { axe } from 'vitest-axe'
import FilmFormatsView from '@/views/FilmFormatsView.vue'
import { formatApi, packageApi } from '@/services/api-client'

const axeOptions = {
  runOnly: { type: 'tag' as const, values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
}

vi.mock('@/services/api-client', () => ({
  formatApi: {
    getAll: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
  packageApi: {
    getAll: vi.fn(),
  },
}))

describe('FilmFormatsView', () => {
  const mockPackages = [
    { id: 'pkg1', name: 'Roll' },
    { id: 'pkg2', name: 'Sheet' },
  ]

  const mockFormats = [
    { id: 'fmt1', name: '35mm', packageId: 'pkg1' },
    { id: 'fmt2', name: '120', packageId: 'pkg1' },
    { id: 'fmt3', name: '4x5', packageId: 'pkg2' },
  ]

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.mocked(formatApi.getAll).mockResolvedValue({ data: mockFormats } as any)
    vi.mocked(formatApi.create).mockResolvedValue({ data: mockFormats[0] } as any)
    vi.mocked(formatApi.delete).mockResolvedValue({} as any)
    vi.mocked(packageApi.getAll).mockResolvedValue({ data: mockPackages } as any)
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

      expect(formatApi.getAll).toHaveBeenCalled()
      expect(wrapper.text()).toContain('35mm')
      expect(wrapper.text()).toContain('120')
      expect(wrapper.text()).toContain('4x5')
    })

    it('should show empty state when no formats exist', async () => {
      vi.mocked(formatApi.getAll).mockResolvedValue({ data: [] } as any)

      const wrapper = mount(FilmFormatsView)
      await flushPromises()

      expect(wrapper.text()).toContain('No formats found.')
    })

    it('should load packages on mount', async () => {
      mount(FilmFormatsView)
      await flushPromises()

      expect(packageApi.getAll).toHaveBeenCalled()
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

    it('should call formatApi.create and reload on form submit', async () => {
      vi.mocked(formatApi.getAll).mockResolvedValue({ data: [] } as any)

      const wrapper = mount(FilmFormatsView)
      await flushPromises()

      const vm = wrapper.vm as any
      vm.showCreateForm = true
      vm.newFormat = { packageId: 1, name: '35mm' }
      await wrapper.vm.$nextTick()

      await vm.createFormat()
      await flushPromises()

      expect(formatApi.create).toHaveBeenCalledWith({ packageId: 1, name: '35mm' })
      expect(formatApi.getAll).toHaveBeenCalledTimes(2)
    })

    it('should close modal and reset form after successful create', async () => {
      const wrapper = mount(FilmFormatsView)
      await flushPromises()

      const vm = wrapper.vm as any
      vm.showCreateForm = true
      vm.newFormat = { packageId: 'pkg1', name: '120' }
      await vm.createFormat()
      await flushPromises()

      expect(vm.showCreateForm).toBe(false)
      expect(vm.newFormat.packageId).toBe('')
      expect(vm.newFormat.name).toBe('')
    })

    it('should show error message when create fails', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(formatApi.create).mockRejectedValue(new Error('Server error'))

      const wrapper = mount(FilmFormatsView)
      await flushPromises()

      const vm = wrapper.vm as any
      vm.showCreateForm = true
      vm.newFormat = { packageId: 'pkg1', name: '35mm' }
      await wrapper.vm.$nextTick()

      await vm.createFormat()
      await flushPromises()

      expect(vm.createError).toBeTruthy()
      expect(vm.showCreateForm).toBe(true)
    })
  })

  describe('delete format', () => {
    it('should call formatApi.delete and reload after confirmation', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true)

      const wrapper = mount(FilmFormatsView)
      await flushPromises()

      const vm = wrapper.vm as any
      await vm.deleteFormat('fmt1')
      await flushPromises()

      expect(formatApi.delete).toHaveBeenCalledWith('fmt1')
      expect(formatApi.getAll).toHaveBeenCalledTimes(2)
    })

    it('should not delete when confirm is cancelled', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false)

      const wrapper = mount(FilmFormatsView)
      await flushPromises()

      const vm = wrapper.vm as any
      await vm.deleteFormat('fmt1')
      await flushPromises()

      expect(formatApi.delete).not.toHaveBeenCalled()
    })
  })
})
