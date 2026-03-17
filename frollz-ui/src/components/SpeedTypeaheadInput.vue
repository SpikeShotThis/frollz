<template>
  <div class="relative">
    <input
      :value="rawInput"
      type="text"
      inputmode="numeric"
      v-bind="$attrs"
      @input="onInput"
      @keydown.escape.prevent="close"
      @keydown.down.prevent="moveDown"
      @keydown.up.prevent="moveUp"
      @keydown.enter.prevent="selectHighlighted"
      @blur="onBlur"
      @focus="onFocus"
    />
    <ul
      v-if="isOpen && suggestions.length > 0"
      class="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto"
    >
      <li
        v-for="(suggestion, i) in suggestions"
        :key="suggestion"
        @mousedown.prevent="select(suggestion)"
        class="px-3 py-2 text-sm cursor-pointer"
        :class="
          i === highlightedIndex
            ? 'bg-primary-50 text-primary-700 dark:bg-primary-900 dark:text-primary-200'
            : 'text-gray-900 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-600'
        "
      >
        {{ suggestion }}
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { buildSpeedSuggestions } from '@/utils/speedSuggestions'

const props = defineProps<{
  modelValue: number | undefined
  fetchOptions: (query: string) => Promise<number[]>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number | undefined]
}>()

const rawInput = ref(props.modelValue !== undefined ? String(props.modelValue) : '')

watch(
  () => props.modelValue,
  (newVal) => {
    const str = newVal !== undefined ? String(newVal) : ''
    if (rawInput.value !== str) {
      rawInput.value = str
    }
  },
)

const dbOptions = ref<number[]>([])
const isOpen = ref(false)
const highlightedIndex = ref(-1)
let debounceTimer: ReturnType<typeof setTimeout> | null = null

const suggestions = computed(() => buildSpeedSuggestions(rawInput.value, dbOptions.value))

const onInput = (event: Event) => {
  const val = (event.target as HTMLInputElement).value
  const numeric = val.replace(/\D/g, '')
  rawInput.value = numeric
  ;(event.target as HTMLInputElement).value = numeric

  emit('update:modelValue', numeric ? Number(numeric) : undefined)

  isOpen.value = true
  highlightedIndex.value = -1
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => fetchOptions(), 200)
}

const fetchOptions = async () => {
  if (!rawInput.value.trim()) {
    dbOptions.value = []
    return
  }
  try {
    dbOptions.value = await props.fetchOptions(rawInput.value)
  } catch {
    dbOptions.value = []
  }
}

const select = (value: number) => {
  rawInput.value = String(value)
  emit('update:modelValue', value)
  close()
}

const close = () => {
  isOpen.value = false
  highlightedIndex.value = -1
}

const onBlur = () => {
  setTimeout(() => close(), 150)
}

const onFocus = () => {
  if (rawInput.value.trim()) {
    isOpen.value = true
  }
}

const moveDown = () => {
  if (!isOpen.value) return
  highlightedIndex.value = Math.min(highlightedIndex.value + 1, suggestions.value.length - 1)
}

const moveUp = () => {
  if (!isOpen.value) return
  highlightedIndex.value = Math.max(highlightedIndex.value - 1, -1)
}

const selectHighlighted = () => {
  if (highlightedIndex.value >= 0 && highlightedIndex.value < suggestions.value.length) {
    select(suggestions.value[highlightedIndex.value])
  }
}
</script>
