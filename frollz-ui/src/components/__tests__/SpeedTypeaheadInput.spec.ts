// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { axe } from 'vitest-axe'
import SpeedTypeaheadInput from '@/components/SpeedTypeaheadInput.vue'

const axeOptions = {
  runOnly: { type: 'tag' as const, values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
}

const fetchOptions = vi.fn().mockResolvedValue([])

describe('SpeedTypeaheadInput', () => {
  it('renders without a11y violations when an aria-label is provided', async () => {
    // Component is designed to receive label context from the parent via $attrs
    // (aria-label or a wrapping <label>). Test with aria-label to represent
    // correct consumer usage; full ARIA combobox pattern is addressed in #201.
    const wrapper = mount(SpeedTypeaheadInput, {
      props: { modelValue: undefined, fetchOptions },
      attrs: { 'aria-label': 'Film speed (ISO)' },
    })

    const results = await axe(wrapper.element, axeOptions)
    expect(results).toHaveNoViolations()
  })
})
