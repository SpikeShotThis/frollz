<template>
  <div>
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Film Formats</h1>
      <button
        @click="showCreateForm = true"
        class="bg-primary-600 text-white px-4 py-2 min-h-[44px] rounded-md hover:bg-primary-700 font-medium"
      >
        Add Format
      </button>
    </div>

    <!-- Mobile card list (hidden on md+) -->
    <div class="md:hidden space-y-3" :aria-busy="isLoading" aria-label="Film formats list">
      <p v-if="filmFormats.length === 0" class="text-center py-8 text-gray-600 dark:text-gray-400 italic">No formats found.</p>
      <div
        v-for="format in filmFormats"
        :key="format.id"
        class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4"
      >
        <div class="flex justify-between items-start gap-3">
          <div>
            <p class="font-semibold text-gray-900 dark:text-gray-100">{{ format.name }}</p>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{{ packageNameById[format.packageId] ?? '—' }}</p>
          </div>
          <button
            @click="deleteFormat(format.id)"
            class="shrink-0 px-3 py-2.5 min-h-[44px] text-xs font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-600 rounded hover:bg-red-50 dark:hover:bg-red-900/30"
          >Delete</button>
        </div>
      </div>
    </div>

    <!-- Desktop table (hidden below md) -->
    <div class="hidden md:block bg-white dark:bg-gray-800 rounded-lg shadow-md" :aria-busy="isLoading" aria-label="Film formats table">
      <div class="overflow-x-auto">
        <table class="min-w-full">
          <thead class="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Package
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Format
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            <tr v-for="format in filmFormats" :key="format.id">
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                {{ packageNameById[format.packageId] ?? '—' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                {{ format.name }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  @click="deleteFormat(format.id)"
                  class="inline-flex items-center px-3 py-2 min-h-[44px] text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
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
    <div v-if="showCreateForm" class="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-lg font-semibold dark:text-gray-100 mb-4">Add Film Format</h3>
        <!-- eslint-disable vuejs-accessibility/label-has-for, vuejs-accessibility/form-control-has-label -- for/id label associations will be added in #199 -->
        <form @submit.prevent="createFormat">
          <div class="mb-4">
            <label for="format-package" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Package <span class="text-red-500" aria-hidden="true">*</span>
              <select id="format-package" v-model="newFormat.packageId" required aria-required="true" class="mt-2 w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                <option value="">Select Package</option>
                <option v-for="pkg in packages" :key="pkg.id" :value="pkg.id">{{ pkg.name }}</option>
              </select>
            </label>
          </div>

          <div class="mb-4">
            <label for="format-name" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Format Name <span class="text-red-500" aria-hidden="true">*</span>
              <input
                id="format-name"
                v-model="newFormat.name"
                type="text"
                required
                aria-required="true"
                placeholder="e.g. 35mm, 120, 4x5"
                class="mt-2 w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              />
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
        <!-- eslint-enable vuejs-accessibility/label-has-for, vuejs-accessibility/form-control-has-label -->
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { formatApi, packageApi } from '@/services/api-client'
import type { Format, Package } from '@/types'
import BaseModal from '@/components/BaseModal.vue'
import { useNotificationStore } from '@/stores/notification'

const notification = useNotificationStore()

const filmFormats = ref<Format[]>([])
const packages = ref<Package[]>([])
const isLoading = ref(false)
const showCreateForm = ref(false)
const createError = ref('')
const newFormat = ref({ packageId: '', name: '' })

const packageNameById = computed(() => {
  const map: Record<string, string> = {}
  for (const pkg of packages.value) map[pkg.id] = pkg.name
  return map
})

const loadFormats = async () => {
  isLoading.value = true
  try {
    const response = await formatApi.getAll()
    filmFormats.value = response.data
  } catch (error) {
    console.error('Error loading film formats:', error)
  } finally {
    isLoading.value = false
  }
}

const loadPackages = async () => {
  try {
    const response = await packageApi.getAll()
    packages.value = response.data
  } catch (error) {
    console.error('Error loading packages:', error)
  }
}

const createFormat = async () => {
  createError.value = ''
  try {
    await formatApi.create({ ...newFormat.value, packageId: Number(newFormat.value.packageId) })
    showCreateForm.value = false
    newFormat.value = { packageId: '', name: '' }
    await loadFormats()
    notification.announce('Film format added')
  } catch (error) {
    console.error('Error creating film format:', error)
    createError.value = 'Failed to create film format. Please try again.'
  }
}

const deleteFormat = async (id: number) => {
  if (confirm('Are you sure you want to delete this format?')) {
    try {
      await formatApi.delete(id)
      await loadFormats()
    } catch (error) {
      console.error('Error deleting film format:', error)
    }
  }
}

onMounted(() => {
  loadFormats()
  loadPackages()
})
</script>
