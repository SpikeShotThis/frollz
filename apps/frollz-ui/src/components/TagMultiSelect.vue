<template>
  <div class="space-y-2">
    <!-- Selected tags (removable chips) -->
    <div v-if="selectedTags.length > 0" class="flex flex-wrap gap-2">
      <button
        v-for="tag in selectedTags"
        :key="tag.id"
        type="button"
        @click="removeTag(tag.id)"
        class="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full text-sm transition-colors"
        :style="{
          backgroundColor: tag.colorCode,
          color: 'white',
        }"
        :aria-label="`Remove ${tag.name}`"
      >
        {{ tag.name }}
        <svg
          class="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>

    <!-- Searchable input + dropdown -->
    <div class="relative">
      <input
        id="tag-multi-select-input"
        name="tags"
        v-model="searchQuery"
        type="text"
        :placeholder="placeholder"
        aria-label="Search tags"
        class="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
        @focus="isOpen = true"
        @blur="handleBlur"
      />

      <!-- Dropdown list -->
      <div
        v-show="isOpen && filteredOptions.length > 0"
        class="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg z-10 max-h-48 overflow-y-auto"
      >
        <button
          v-for="tag in filteredOptions"
          :key="tag.id"
          type="button"
          @mousedown.prevent="selectTag(tag)"
          class="block w-full text-left px-3 py-2 hover:bg-primary-50 dark:hover:bg-primary-900/30 flex items-center gap-2 text-sm text-gray-900 dark:text-gray-100 transition-colors min-h-[2.5rem]"
        >
          <span
            class="inline-block w-2 h-2 rounded-full shrink-0"
            :style="{ backgroundColor: tag.colorCode }"
          ></span>
          {{ tag.name }}
        </button>
      </div>

      <!-- No results message -->
      <div
        v-show="isOpen && searchQuery.trim() && filteredOptions.length === 0"
        class="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg z-10 px-3 py-2 text-sm text-gray-500 dark:text-gray-400"
      >
        No tags found
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import type { Tag } from "@/types";

interface Props {
  modelValue: number[];
  availableTags: Tag[];
  placeholder?: string;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: "Search or add tags…",
});

const emit = defineEmits<{
  "update:modelValue": [value: number[]];
}>();

const searchQuery = ref("");
const isOpen = ref(false);

const selectedTags = computed(() =>
  props.availableTags.filter((tag) => props.modelValue.includes(tag.id)),
);

const filteredOptions = computed(() => {
  const query = searchQuery.value.toLowerCase();
  return props.availableTags.filter(
    (tag) =>
      !props.modelValue.includes(tag.id) &&
      tag.name.toLowerCase().includes(query),
  );
});

const selectTag = (tag: Tag) => {
  const newValue = [...props.modelValue, tag.id];
  emit("update:modelValue", newValue);
  searchQuery.value = "";
};

const removeTag = (tagId: number) => {
  const newValue = props.modelValue.filter((id) => id !== tagId);
  emit("update:modelValue", newValue);
};

const handleBlur = () => {
  setTimeout(() => {
    isOpen.value = false;
  }, 100);
};
</script>
