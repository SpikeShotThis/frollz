<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-80"
  >
    <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -- role="dialog" is an interactive ARIA widget; keyboard handlers are required for focus trap and Escape-to-close -->
    <div
      ref="panelRef"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      tabindex="-1"
      class="w-full rounded-t-2xl sm:rounded-lg bg-white dark:bg-gray-800 shadow-xl p-6 max-h-[90vh] overflow-y-auto sm:max-w-lg sm:mx-4 focus:outline-none"
      @keydown.escape.prevent="emit('close')"
      @keydown.capture="trapFocus"
    >
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'

const props = defineProps<{
  open: boolean
  titleid: number
}>()

const emit = defineEmits<{
  close: []
}>()

const panelRef = ref<HTMLElement | null>(null)
let triggerEl: HTMLElement | null = null

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

const getFocusable = () =>
  Array.from(panelRef.value?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [])

const trapFocus = (e: KeyboardEvent) => {
  if (e.key !== 'Tab') return
  const focusable = getFocusable()
  if (focusable.length === 0) return
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (e.shiftKey) {
    if (document.activeElement === first) {
      e.preventDefault()
      last.focus()
    }
  } else {
    if (document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }
}

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      triggerEl = document.activeElement as HTMLElement
      await nextTick()
      const focusable = getFocusable()
      ;(focusable[0] ?? panelRef.value)?.focus()
    } else {
      await nextTick()
      triggerEl?.focus()
      triggerEl = null
    }
  },
)
</script>
