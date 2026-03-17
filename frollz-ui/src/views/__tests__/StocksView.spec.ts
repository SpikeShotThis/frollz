// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import StocksView from '@/views/StocksView.vue'
import { stockApi, filmFormatApi, tagApi, stockTagApi } from '@/services/api-client'
import { Process, FormFactor } from '@/types'

// Mock the API modules
vi.mock('@/services/api-client', () => ({
  stockApi: {
    getAll: vi.fn(),
    createMultipleFormats: vi.fn(),
    getBrands: vi.fn(),
    getManufacturers: vi.fn(),
    getSpeeds: vi.fn(),
  },
  filmFormatApi: {
    getAll: vi.fn(),
  },
  tagApi: {
    getAll: vi.fn(),
  },
  stockTagApi: {
    getAll: vi.fn(),
    create: vi.fn(),
  },
}))

describe('StocksView', () => {
  const mockFormats = [
    { _key: '35mm', format: '35mm', formFactor: 'Roll' },
    { _key: '120', format: '120', formFactor: 'Roll' },
    { _key: 'i-type', format: 'I-Type', formFactor: 'Instant' },
    { _key: '600', format: '600', formFactor: 'Instant' },
  ]

  const mockStocks = [
    {
      _key: 'kodak-portra-400-400-35mm',
      brand: 'Portra 400',
      manufacturer: 'Kodak',
      format: '35mm', 
      process: Process.C_41,
      speed: 400,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default mock returns
    vi.mocked(stockApi.getAll).mockResolvedValue({ data: mockStocks } as any)
    vi.mocked(filmFormatApi.getAll).mockResolvedValue({ data: mockFormats } as any)
    vi.mocked(tagApi.getAll).mockResolvedValue({ data: [] } as any)
    vi.mocked(stockTagApi.getAll).mockResolvedValue({ data: [] } as any)
    vi.mocked(stockApi.getBrands).mockResolvedValue({ data: [] } as any)
    vi.mocked(stockApi.getManufacturers).mockResolvedValue({ data: [] } as any)
    vi.mocked(stockApi.getSpeeds).mockResolvedValue({ data: [] } as any)
  })

  describe('component mounting', () => {
    it('should mount successfully and load data', async () => {
      const wrapper = mount(StocksView)
      await flushPromises()

      expect(stockApi.getAll).toHaveBeenCalled()
      expect(filmFormatApi.getAll).toHaveBeenCalled()
    })
  })

  describe('format filtering', () => {
    it('should return empty array when no process is selected', async () => {
      const wrapper = mount(StocksView)
      await flushPromises()

      expect((wrapper.vm as any).filteredFormats).toEqual([])
    })

    it('should return only instant formats when Instant process is selected', async () => {
      const wrapper = mount(StocksView)
      await flushPromises()

      const vm = wrapper.vm as any
      vm.form.process = Process.INSTANT
      await wrapper.vm.$nextTick()

      expect(vm.filteredFormats.every((f: any) => f.formFactor === FormFactor.INSTANT)).toBe(true)
      expect(vm.filteredFormats).toHaveLength(2)
    })

    it('should return only non-instant formats when a non-instant process is selected', async () => {
      const wrapper = mount(StocksView)
      await flushPromises()

      const vm = wrapper.vm as any
      vm.form.process = Process.C_41
      await wrapper.vm.$nextTick()

      expect(vm.filteredFormats.every((f: any) => f.formFactor !== FormFactor.INSTANT)).toBe(true)
      expect(vm.filteredFormats).toHaveLength(2)
    })

    it('should clear selected formatKeys when process changes', async () => {
      const wrapper = mount(StocksView)
      await flushPromises()

      const vm = wrapper.vm as any
      vm.form.process = Process.C_41
      vm.form.formatKeys = ['35mm', '120']
      await wrapper.vm.$nextTick()

      vm.form.process = Process.INSTANT
      await flushPromises()

      expect(vm.form.formatKeys).toEqual([])
    })
  })

  describe('form validation', () => {
    it('should validate format selection in handleSubmit', async () => {
      const wrapper = mount(StocksView)
      const vm = wrapper.vm as any
      
      // Set up form with missing formats
      vm.form = {
        brand: 'Test Brand',
        manufacturer: 'Test Manufacturer',
        formatKeys: [], // Empty formats should trigger validation
        process: Process.C_41,
        speed: 400,
        boxImageUrl: '',
      }

      // Call handleSubmit directly
      await vm.handleSubmit()
      
      // Should set validation error
      expect(vm.error).toContain('Please select at least one format')
    })

    it('should proceed with API call when formats are selected', async () => {
      const mockCreatedStocks = [
        { _key: 'test-manufacturer-test-brand-400-35mm' },
      ]
      
      vi.mocked(stockApi.createMultipleFormats).mockResolvedValue({ 
        data: mockCreatedStocks 
      } as any)

      const wrapper = mount(StocksView)
      const vm = wrapper.vm as any
      
      // Set up valid form
      vm.form = {
        brand: 'Test Brand',
        manufacturer: 'Test Manufacturer',
        formatKeys: ['35mm'],
        process: Process.C_41,
        speed: 400,
        boxImageUrl: '',
      }
      vm.selectedTagKeys = []

      // Call handleSubmit directly
      await vm.handleSubmit()
      
      // Should call the API with correct data
      expect(stockApi.createMultipleFormats).toHaveBeenCalledWith({
        brand: 'Test Brand',
        manufacturer: 'Test Manufacturer',
        formatKeys: ['35mm'],
        process: Process.C_41,
        speed: 400,
      })
    })
  })

  describe('multiple format creation', () => {
    it('should call API with multiple format keys', async () => {
      const mockCreatedStocks = [
        { _key: 'test-manufacturer-test-brand-400-35mm' },
        { _key: 'test-manufacturer-test-brand-400-120' },
      ]
      
      vi.mocked(stockApi.createMultipleFormats).mockResolvedValue({ 
        data: mockCreatedStocks 
      } as any)

      const wrapper = mount(StocksView)
      const vm = wrapper.vm as any
      
      // Set up form with multiple formats
      vm.form = {
        brand: 'Test Brand',
        manufacturer: 'Test Manufacturer',
        formatKeys: ['35mm', '120'],
        process: Process.C_41,
        speed: 400,
        boxImageUrl: '',
      }
      vm.selectedTagKeys = []

      await vm.handleSubmit()
      
      expect(stockApi.createMultipleFormats).toHaveBeenCalledWith({
        brand: 'Test Brand',
        manufacturer: 'Test Manufacturer',
        formatKeys: ['35mm', '120'],
        process: Process.C_41,
        speed: 400,
      })
    })

    it('should associate tags with all created stocks', async () => {
      const mockCreatedStocks = [
        { _key: 'stock1' },
        { _key: 'stock2' },
      ]
      
      vi.mocked(stockApi.createMultipleFormats).mockResolvedValue({ 
        data: mockCreatedStocks 
      } as any)

      const wrapper = mount(StocksView)
      const vm = wrapper.vm as any
      
      vm.form = {
        brand: 'Test Brand',
        manufacturer: 'Test Manufacturer',
        formatKeys: ['35mm', '120'],
        process: Process.C_41,
        speed: 400,
        boxImageUrl: '',
      }
      vm.selectedTagKeys = ['tag1', 'tag2']

      await vm.handleSubmit()
      
      // Should create tag associations for all stocks and tags (2 stocks × 2 tags = 4 calls)
      expect(stockTagApi.create).toHaveBeenCalledTimes(4)
      expect(stockTagApi.create).toHaveBeenCalledWith({ stockKey: 'stock1', tagKey: 'tag1' })
      expect(stockTagApi.create).toHaveBeenCalledWith({ stockKey: 'stock1', tagKey: 'tag2' })
      expect(stockTagApi.create).toHaveBeenCalledWith({ stockKey: 'stock2', tagKey: 'tag1' })
      expect(stockTagApi.create).toHaveBeenCalledWith({ stockKey: 'stock2', tagKey: 'tag2' })
    })
  })
})
