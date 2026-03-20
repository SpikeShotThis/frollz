<template>
  <div>
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Film Formats</h1>
      <button
        @click="showCreateForm = true"
        class="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 font-medium"
      >
        Add Format
      </button>
    </div>

    <!-- Mobile card list (hidden on md+) -->
    <div class="md:hidden space-y-3">
      <p v-if="filmFormats.length === 0" class="text-center py-8 text-gray-400 dark:text-gray-500 italic">No formats found.</p>
      <div
        v-for="format in filmFormats"
        :key="format._key"
        class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4"
      >
        <div class="flex justify-between items-start gap-3">
          <div>
            <p class="font-semibold text-gray-900 dark:text-gray-100">{{ format.format }}</p>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{{ format.formFactor }}</p>
            <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">{{ formatDate(format.createdAt) }}</p>
          </div>
          <button
            @click="deleteFormat(format._key!)"
            class="shrink-0 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-600 rounded hover:bg-red-50 dark:hover:bg-red-900/30"
          >Delete</button>
        </div>
      </div>
    </div>

    <!-- Desktop table (hidden below md) -->
    <div class="hidden md:block bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <div class="overflow-x-auto">
        <table class="min-w-full">
          <thead class="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Form Factor
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Format
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Created
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            <tr v-for="format in filmFormats" :key="format._key">
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                {{ format.formFactor }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                {{ format.format }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                {{ formatDate(format.createdAt) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  @click="deleteFormat(format._key!)"
                  class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                >
                  Delete
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create Form Modal -->
    <BaseModal :open="showCreateForm" title-id="add-format-title" @close="showCreateForm = false">
        <h3 id="add-format-title" class="text-lg font-semibold dark:text-gray-100 mb-4">Add Film Format</h3>
        <form @submit.prevent="createFormat">
          <div class="mb-4">
            <label for="format-form-factor" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Form Factor <span class="text-red-500" aria-hidden="true">*</span>
              <select id="format-form-factor" v-model="newFormat.formFactor" required aria-required="true" class="mt-2 w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                <option value="">Select Form Factor</option>
                <option value="Roll">Roll</option>
                <option value="Sheet">Sheet</option>
                <option value="Instant">Instant</option>
                <option value="100ft Bulk">100ft Bulk</option>
                <option value="400ft Bulk">400ft Bulk</option>
              </select>
            </label>
          </div>

          <div class="mb-4">
            <label for="format-format" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Format <span class="text-red-500" aria-hidden="true">*</span>
              <select id="format-format" v-model="newFormat.format" required aria-required="true" class="mt-2 w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                <option value="">Select Format</option>
                <option value="35mm">35mm</option>
                <option value="110">110</option>
                <option value="120">120</option>
                <option value="220">220</option>
                <option value="4x5">4x5</option>
                <option value="8x10">8x10</option>
              </select>
            </label>
          </div>

          <div v-if="createError" role="alert" class="mb-4 text-sm text-red-600 dark:text-red-400">{{ createError }}</div>

          <div class="flex justify-end space-x-2">
            <button
              type="button"
              @click="showCreateForm = false"
              class="px-4 py-2 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              Create
            </button>
          </div>
        </form>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { filmFormatApi } from '@/services/api-client'
import type { FilmFormat, FormFactor, Format } from '@/types'
import BaseModal from '@/components/BaseModal.vue'

const filmFormats = ref<FilmFormat[]>([])
const showCreateForm = ref(false)
const createError = ref('')
const newFormat = ref({
  formFactor: '' as FormFactor,
  format: '' as Format,
})

const formatDate = (date?: Date) => {
  return date ? new Date(date).toLocaleDateString() : '-'
}

const loadFormats = async () => {
  try {
    const response = await filmFormatApi.getAll()
    filmFormats.value = response.data
  } catch (error) {
    console.error('Error loading film formats:', error)
  }
}

const createFormat = async () => {
  createError.value = ''
  try {
    await filmFormatApi.create(newFormat.value)
    showCreateForm.value = false
    newFormat.value = { formFactor: '' as FormFactor, format: '' as Format }
    await loadFormats()
  } catch (error) {
    console.error('Error creating film format:', error)
    createError.value = 'Failed to create film format. Please try again.'
  }
}

const deleteFormat = async (key: string) => {
  if (confirm('Are you sure you want to delete this format?')) {
    try {
      await filmFormatApi.delete(key)
      await loadFormats()
    } catch (error) {
      console.error('Error deleting film format:', error)
    }
  }
}

onMounted(() => {
  loadFormats()
})
</script>
