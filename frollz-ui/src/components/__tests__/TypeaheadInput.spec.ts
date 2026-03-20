// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { axe } from 'vitest-axe'
import TypeaheadInput from '@/components/TypeaheadInput.vue'

const axeOptions = {
  runOnly: { type: 'tag' as const, values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
}

const fetchOptions = vi.fn().mockResolvedValue([])

describe('TypeaheadInput', () => {
  it('renders without a11y violations when an aria-label is provided', async () => {
    const wrapper = mount(TypeaheadInput, {
      props: { modelValue: '', fetchOptions },
      attrs: { 'aria-label': 'Stock brand' },
    })

    const results = await axe(wrapper.element, axeOptions)
    expect(results).toHaveNoViolations()
  })

  it('has correct ARIA combobox attributes on the input', () => {
    const wrapper = mount(TypeaheadInput, {
      props: { modelValue: '', fetchOptions },
      attrs: { 'aria-label': 'Stock brand' },
    })

    const input = wrapper.find('input')
    expect(input.attributes('role')).toBe('combobox')
    expect(input.attributes('aria-autocomplete')).toBe('list')
    expect(input.attributes('aria-expanded')).toBe('false')
    expect(input.attributes('aria-controls')).toBeTruthy()
  })

  describe('with fake timers', () => {
    beforeEach(() => { vi.useFakeTimers() })
    afterEach(() => { vi.useRealTimers() })

    it('listbox has role="listbox" and options have role="option"', async () => {
      const fetchWithResults = vi.fn().mockResolvedValue(['Kodak', 'Fuji'])
      const wrapper = mount(TypeaheadInput, {
        props: { modelValue: 'K', fetchOptions: fetchWithResults },
        attrs: { 'aria-label': 'Stock brand' },
      })

      await wrapper.find('input').trigger('input')
      await vi.runAllTimersAsync()
      await nextTick()

      const ul = wrapper.find('ul')
      expect(ul.attributes('role')).toBe('listbox')

      const options = wrapper.findAll('li')
      for (const option of options) {
        expect(option.attributes('role')).toBe('option')
        expect(option.attributes('aria-selected')).toBeDefined()
        expect(option.attributes('id')).toBeTruthy()
      }
    })

    it('updates aria-activedescendant as arrow keys navigate the list', async () => {
      const fetchWithResults = vi.fn().mockResolvedValue(['Kodak', 'Fuji'])
      const wrapper = mount(TypeaheadInput, {
        props: { modelValue: 'K', fetchOptions: fetchWithResults },
        attrs: { 'aria-label': 'Stock brand' },
      })

      await wrapper.find('input').trigger('input')
      await vi.runAllTimersAsync()
      await nextTick()

      const input = wrapper.find('input')
      expect(input.attributes('aria-activedescendant')).toBeUndefined()

      await input.trigger('keydown', { key: 'ArrowDown' })
      expect(input.attributes('aria-activedescendant')).toBeTruthy()

      await input.trigger('keydown', { key: 'Escape' })
      expect(input.attributes('aria-expanded')).toBe('false')
    })
  })
})
