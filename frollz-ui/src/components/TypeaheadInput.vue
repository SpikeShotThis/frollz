<template>
  <div class="relative">
    <input
      v-model="inputValue"
      type="text"
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
      class="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto"
    >
      <li
        v-for="(suggestion, i) in suggestions"
        :key="suggestion"
        @mousedown.prevent="select(suggestion)"
        class="px-3 py-2 text-sm cursor-pointer"
        :class="
          i === highlightedIndex
            ? 'bg-primary-50 text-primary-700'
            : 'text-gray-900 hover:bg-gray-50'
        "
      >
        {{ suggestion }}
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { buildSuggestions } from '@/utils/brandSuggestions'

const props = defineProps<{
  modelValue: string
  fetchOptions: (query: string) => Promise<string[]>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const inputValue = computed({
  get: () => props.modelValue,
  set: (val: string) => emit('update:modelValue', val),
})

const dbOptions = ref<string[]>([])
const isOpen = ref(false)
const highlightedIndex = ref(-1)
let debounceTimer: ReturnType<typeof setTimeout> | null = null

const suggestions = computed(() => buildSuggestions(inputValue.value, dbOptions.value))

const onInput = () => {
  isOpen.value = true
  highlightedIndex.value = -1
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => fetchOptions(), 200)
}

const fetchOptions = async () => {
  if (!inputValue.value.trim()) {
    dbOptions.value = []
    return
  }
  try {
    dbOptions.value = await props.fetchOptions(inputValue.value)
  } catch {
    dbOptions.value = []
  }
}

const select = (value: string) => {
  inputValue.value = value
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
  if (inputValue.value.trim()) {
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
