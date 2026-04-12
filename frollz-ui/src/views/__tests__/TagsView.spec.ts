// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { axe } from 'vitest-axe'
import TagsView from '@/views/TagsView.vue'
import { tagApi } from '@/services/api-client'

const axeOptions = {
  runOnly: { type: 'tag' as const, values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
}

vi.mock('@/services/api-client', () => ({
  tagApi: {
    getAll: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('TagsView', () => {
  const mockTags = [
    { id: 'tag1', name: 'Color', colorCode: '#ff0000' },
    { id: 'tag2', name: 'BW', colorCode: '#000000' },
    { id: 'tag3', name: 'Slide', colorCode: '#0000ff' },
  ]

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.mocked(tagApi.getAll).mockResolvedValue({ data: mockTags } as any)
  })

  describe('accessibility', () => {
    it('renders the tag list without a11y violations', async () => {
      const wrapper = mount(TagsView)
      await flushPromises()

      const results = await axe(wrapper.element, axeOptions)
      expect(results).toHaveNoViolations()
    })

    it('renders the tag list with inline edit active without a11y violations', async () => {
      const wrapper = mount(TagsView)
      await flushPromises()

      const vm = wrapper.vm as any
      vm.startEdit(mockTags[0])
      await wrapper.vm.$nextTick()

      const results = await axe(wrapper.element, axeOptions)
      expect(results).toHaveNoViolations()
    })
  })

  describe('accessibility', () => {
    it('renders the tag list without a11y violations', async () => {
      const wrapper = mount(TagsView)
      await flushPromises()

      const results = await axe(wrapper.element, axeOptions)
      expect(results).toHaveNoViolations()
    })

    it('renders the tag list with inline edit active without a11y violations', async () => {
      const wrapper = mount(TagsView)
      await flushPromises()

      const vm = wrapper.vm as any
      vm.startEdit(mockTags[0])
      await wrapper.vm.$nextTick()

      const results = await axe(wrapper.element, axeOptions)
      expect(results).toHaveNoViolations()
    })
  })

  describe('component mounting', () => {
    it('should load and display tags on mount', async () => {
      const wrapper = mount(TagsView)
      await flushPromises()

      expect(tagApi.getAll).toHaveBeenCalled()
      expect(wrapper.text()).toContain('Color')
      expect(wrapper.text()).toContain('BW')
      expect(wrapper.text()).toContain('Slide')
    })

    it('should show empty state message when no tags', async () => {
      vi.mocked(tagApi.getAll).mockResolvedValue({ data: [] } as any)
      const wrapper = mount(TagsView)
      await flushPromises()

      expect(wrapper.text()).toContain('No tags found.')
    })
  })

  describe('inline editing', () => {
    it('should enter edit mode when edit button is clicked', async () => {
      const wrapper = mount(TagsView)
      await flushPromises()

      const vm = wrapper.vm as any
      vm.startEdit(mockTags[0])
      await wrapper.vm.$nextTick()

      expect(vm.editingId).toBe('tag1')
      expect(vm.editForm.name).toBe('Color')
      expect(vm.editForm.colorCode).toBe('#ff0000')
    })

    it('should show text inputs when in edit mode', async () => {
      const wrapper = mount(TagsView)
      await flushPromises()

      const vm = wrapper.vm as any
      vm.startEdit(mockTags[0])
      await wrapper.vm.$nextTick()

      const textInput = wrapper.find('input[type="text"]')
      expect(textInput.exists()).toBe(true)
      expect((textInput.element as HTMLInputElement).value).toBe('Color')

      const colorInput = wrapper.find('input[type="color"]')
      expect(colorInput.exists()).toBe(true)
    })

    it('should show Save and Cancel controls in edit mode', async () => {
      const wrapper = mount(TagsView)
      await flushPromises()

      const vm = wrapper.vm as any
      vm.startEdit(mockTags[0])
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('Cancel')
    })

    it('should call tagApi.update with edited values on save', async () => {
      vi.mocked(tagApi.update).mockResolvedValue({ data: {} } as any)
      const wrapper = mount(TagsView)
      await flushPromises()

      const vm = wrapper.vm as any
      vm.startEdit(mockTags[0])
      vm.editForm.name = 'Updated'
      vm.editForm.colorCode = '#123456'

      await vm.saveEdit('tag1')

      expect(tagApi.update).toHaveBeenCalledWith('tag1', {
        name: 'Updated',
        colorCode: '#123456',
        description: undefined,
      })
    })

    it('should exit edit mode after saving', async () => {
      vi.mocked(tagApi.update).mockResolvedValue({ data: {} } as any)
      const wrapper = mount(TagsView)
      await flushPromises()

      const vm = wrapper.vm as any
      vm.startEdit(mockTags[0])
      await vm.saveEdit('tag1')
      await flushPromises()

      expect(vm.editingId).toBeNull()
    })

    it('should exit edit mode and discard changes on cancel', async () => {
      const wrapper = mount(TagsView)
      await flushPromises()

      const vm = wrapper.vm as any
      vm.startEdit(mockTags[0])
      vm.editForm.name = 'Changed'
      vm.cancelEdit()
      await wrapper.vm.$nextTick()

      expect(vm.editingId).toBeNull()
    })
  })

  describe('delete flow', () => {
    it('should open confirmation modal and set deleteTarget on delete click', async () => {
      const wrapper = mount(TagsView)
      await flushPromises()

      const vm = wrapper.vm as any
      vm.confirmDelete(mockTags[0])
      await wrapper.vm.$nextTick()

      expect(vm.deleteTarget).toEqual(mockTags[0])
    })

    it('should display the tag name in the confirmation modal', async () => {
      const wrapper = mount(TagsView)
      await flushPromises()

      const vm = wrapper.vm as any
      vm.confirmDelete(mockTags[0])
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('Color')
    })

    it('should call tagApi.delete and reload on confirm', async () => {
      vi.mocked(tagApi.delete).mockResolvedValue({} as any)

      const wrapper = mount(TagsView)
      await flushPromises()

      const vm = wrapper.vm as any
      vm.confirmDelete(mockTags[0])
      await vm.executeDelete()
      await flushPromises()

      expect(tagApi.delete).toHaveBeenCalledWith('tag1')
      expect(tagApi.getAll).toHaveBeenCalledTimes(2)
    })

    it('should clear deleteTarget after delete', async () => {
      vi.mocked(tagApi.delete).mockResolvedValue({} as any)

      const wrapper = mount(TagsView)
      await flushPromises()

      const vm = wrapper.vm as any
      vm.confirmDelete(mockTags[0])
      await vm.executeDelete()
      await flushPromises()

      expect(vm.deleteTarget).toBeNull()
    })

    it('should not delete when cancel is pressed', async () => {
      const wrapper = mount(TagsView)
      await flushPromises()

      const vm = wrapper.vm as any
      vm.confirmDelete(mockTags[0])
      vm.deleteTarget = null
      await wrapper.vm.$nextTick()

      expect(tagApi.delete).not.toHaveBeenCalled()
    })
  })

  describe('pagination', () => {
    it('should not show pagination when all tags fit on one page', async () => {
      const wrapper = mount(TagsView)
      await flushPromises()

      // 3 tags, PAGE_SIZE = 10 → no pagination controls
      expect(wrapper.text()).not.toContain('Previous')
    })

    it('should show pagination when tags exceed page size', async () => {
      const manyTags = Array.from({ length: 12 }, (_, i) => ({
        id: `tag${i}`,
        name: `Tag ${i}`,
        colorCode: '#aabbcc',
      }))
      vi.mocked(tagApi.getAll).mockResolvedValue({ data: manyTags } as any)

      const wrapper = mount(TagsView)
      await flushPromises()

      expect(wrapper.text()).toContain('Previous')
      expect(wrapper.text()).toContain('Next')
      expect(wrapper.text()).toContain('Page 1 of 2')
    })

    it('should advance page and show next set of tags', async () => {
      const manyTags = Array.from({ length: 12 }, (_, i) => ({
        id: `tag${i}`,
        name: `Tag ${i}`,
        colorCode: '#aabbcc',
      }))
      vi.mocked(tagApi.getAll).mockResolvedValue({ data: manyTags } as any)

      const wrapper = mount(TagsView)
      await flushPromises()

      const vm = wrapper.vm as any
      expect(vm.paginatedTags).toHaveLength(10)

      vm.currentPage = 2
      await wrapper.vm.$nextTick()
      expect(vm.paginatedTags).toHaveLength(2)
    })
  })
})
