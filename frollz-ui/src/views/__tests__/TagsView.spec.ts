// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import TagsView from '@/views/TagsView.vue'
import { tagApi, stockTagApi } from '@/services/api-client'

vi.mock('@/services/api-client', () => ({
  tagApi: {
    getAll: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  stockTagApi: {
    getAll: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('TagsView', () => {
  const mockTags = [
    { _key: 'tag1', value: 'Color', color: '#ff0000', createdAt: new Date('2024-01-01') },
    { _key: 'tag2', value: 'BW', color: '#000000', createdAt: new Date('2024-02-01') },
    { _key: 'tag3', value: 'Slide', color: '#0000ff', createdAt: new Date('2024-03-01') },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(tagApi.getAll).mockResolvedValue({ data: mockTags } as any)
    vi.mocked(stockTagApi.getAll).mockResolvedValue({ data: [] } as any)
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
    it('should enter edit mode when pencil button is clicked', async () => {
      const wrapper = mount(TagsView)
      await flushPromises()

      const vm = wrapper.vm as any
      vm.startEdit(mockTags[0])
      await wrapper.vm.$nextTick()

      expect(vm.editingKey).toBe('tag1')
      expect(vm.editForm.value).toBe('Color')
      expect(vm.editForm.color).toBe('#ff0000')
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
      vm.editForm.value = 'Updated'
      vm.editForm.color = '#123456'

      await vm.saveEdit('tag1')

      expect(tagApi.update).toHaveBeenCalledWith('tag1', { value: 'Updated', color: '#123456' })
    })

    it('should exit edit mode after saving', async () => {
      vi.mocked(tagApi.update).mockResolvedValue({ data: {} } as any)
      const wrapper = mount(TagsView)
      await flushPromises()

      const vm = wrapper.vm as any
      vm.startEdit(mockTags[0])
      await vm.saveEdit('tag1')
      await flushPromises()

      expect(vm.editingKey).toBeNull()
    })

    it('should exit edit mode and discard changes on cancel', async () => {
      const wrapper = mount(TagsView)
      await flushPromises()

      const vm = wrapper.vm as any
      vm.startEdit(mockTags[0])
      vm.editForm.value = 'Changed'
      vm.cancelEdit()
      await wrapper.vm.$nextTick()

      expect(vm.editingKey).toBeNull()
    })
  })

  describe('delete flow', () => {
    it('should fetch stock-tag count and open confirmation modal on delete click', async () => {
      vi.mocked(stockTagApi.getAll).mockResolvedValue({
        data: [
          { _key: 'st1', stockKey: 'stock1', tagKey: 'tag1' },
          { _key: 'st2', stockKey: 'stock2', tagKey: 'tag1' },
        ],
      } as any)

      const wrapper = mount(TagsView)
      await flushPromises()

      const vm = wrapper.vm as any
      await vm.confirmDelete(mockTags[0])
      await wrapper.vm.$nextTick()

      expect(stockTagApi.getAll).toHaveBeenCalledWith({ tagKey: 'tag1' })
      expect(vm.deleteTarget).toEqual(mockTags[0])
      expect(vm.deleteStockTagCount).toBe(2)
    })

    it('should display the association count in the confirmation modal', async () => {
      vi.mocked(stockTagApi.getAll).mockResolvedValue({
        data: [{ _key: 'st1', stockKey: 'stock1', tagKey: 'tag1' }],
      } as any)

      const wrapper = mount(TagsView)
      await flushPromises()

      const vm = wrapper.vm as any
      await vm.confirmDelete(mockTags[0])
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('1')
      expect(wrapper.text()).toContain('Color')
    })

    it('should delete all stock-tags and then the tag on confirm', async () => {
      const mockStockTags = [
        { _key: 'st1', stockKey: 'stock1', tagKey: 'tag1' },
        { _key: 'st2', stockKey: 'stock2', tagKey: 'tag1' },
      ]
      vi.mocked(stockTagApi.getAll).mockResolvedValue({ data: mockStockTags } as any)
      vi.mocked(stockTagApi.delete).mockResolvedValue({} as any)
      vi.mocked(tagApi.delete).mockResolvedValue({} as any)

      const wrapper = mount(TagsView)
      await flushPromises()

      const vm = wrapper.vm as any
      await vm.confirmDelete(mockTags[0])
      await vm.executeDelete()
      await flushPromises()

      expect(stockTagApi.delete).toHaveBeenCalledWith('st1')
      expect(stockTagApi.delete).toHaveBeenCalledWith('st2')
      expect(tagApi.delete).toHaveBeenCalledWith('tag1')
    })

    it('should clear deleteTarget and reload tags after delete', async () => {
      vi.mocked(stockTagApi.getAll).mockResolvedValue({ data: [] } as any)
      vi.mocked(tagApi.delete).mockResolvedValue({} as any)

      const wrapper = mount(TagsView)
      await flushPromises()

      const vm = wrapper.vm as any
      await vm.confirmDelete(mockTags[0])
      await vm.executeDelete()
      await flushPromises()

      expect(vm.deleteTarget).toBeNull()
      // getAll should have been called again after delete
      expect(tagApi.getAll).toHaveBeenCalledTimes(2)
    })

    it('should close modal without deleting when cancel is pressed', async () => {
      vi.mocked(stockTagApi.getAll).mockResolvedValue({ data: [] } as any)

      const wrapper = mount(TagsView)
      await flushPromises()

      const vm = wrapper.vm as any
      await vm.confirmDelete(mockTags[0])
      vm.deleteTarget = null
      await wrapper.vm.$nextTick()

      expect(tagApi.delete).not.toHaveBeenCalled()
      expect(vm.deleteTarget).toBeNull()
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
        _key: `tag${i}`,
        value: `Tag ${i}`,
        color: '#aabbcc',
        createdAt: new Date(),
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
        _key: `tag${i}`,
        value: `Tag ${i}`,
        color: '#aabbcc',
        createdAt: new Date(),
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
