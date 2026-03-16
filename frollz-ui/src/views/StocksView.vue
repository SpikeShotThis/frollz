<template>
  <div>
    <div class="flex justify-between items-center mb-8">
      <h1 class="text-3xl font-bold text-gray-900">Stocks</h1>
      <button @click="showModal = true" class="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 font-medium">
        Add Stock
      </button>
    </div>

    <div class="bg-white rounded-lg shadow-md">
      <div class="overflow-x-auto">
        <table class="min-w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Brand
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Manufacturer
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Format
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Process
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Speed
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tags
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="stock in sortedStocks" :key="stock._key">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {{ stock.brand }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ stock.manufacturer }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ stock.format }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                  {{ stock.process }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ISO {{ stock.speed }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="tag in stock.tags"
                    :key="tag"
                    class="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs"
                  >
                    {{ tag }}
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Add Stock Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg max-h-screen overflow-y-auto">
        <h2 class="text-xl font-bold text-gray-900 mb-4">Add Stock</h2>
        <form @submit.prevent="handleSubmit">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Brand <span class="text-red-500">*</span></label>
              <input
                v-model="form.brand"
                type="text"
                required
                placeholder="e.g. Portra 400"
                class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Manufacturer <span class="text-red-500">*</span></label>
              <input
                v-model="form.manufacturer"
                type="text"
                required
                placeholder="e.g. Kodak"
                class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Format <span class="text-red-500">*</span></label>
              <select
                v-model="form.formatKey"
                required
                class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="" disabled>Select a format</option>
                <option v-for="fmt in formats" :key="fmt._key" :value="fmt._key">
                  {{ fmt.format }} ({{ fmt.formFactor }})
                </option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Process <span class="text-red-500">*</span></label>
              <select
                v-model="form.process"
                required
                class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="" disabled>Select a process</option>
                <option v-for="p in processOptions" :key="p" :value="p">{{ p }}</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Speed (ISO) <span class="text-red-500">*</span></label>
              <input
                v-model.number="form.speed"
                type="number"
                required
                min="1"
                placeholder="e.g. 400"
                class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Tags</label>
              <input
                v-model="tagsInput"
                type="text"
                placeholder="e.g. color, portrait, professional"
                class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <p class="text-xs text-gray-500 mt-1">Comma-separated list of tags</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Box Image URL</label>
              <input
                v-model="form.boxImageUrl"
                type="url"
                placeholder="https://..."
                class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <div v-if="error" class="mt-4 text-sm text-red-600">{{ error }}</div>
          <div class="flex justify-end gap-3 mt-6">
            <button
              type="button"
              @click="closeModal"
              class="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="submitting"
              class="px-4 py-2 bg-primary-600 text-white rounded-md text-sm hover:bg-primary-700 disabled:opacity-50"
            >
              {{ submitting ? 'Adding...' : 'Add Stock' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { stockApi, filmFormatApi } from '@/services/api-client'
import type { Stock, FilmFormat } from '@/types'
import { Process } from '@/types'

const stocks = ref<Stock[]>([])
const formats = ref<FilmFormat[]>([])
const showModal = ref(false)
const submitting = ref(false)
const error = ref('')
const tagsInput = ref('')

const processOptions = Object.values(Process)

const emptyForm = () => ({
  brand: '',
  manufacturer: '',
  formatKey: '',
  process: '' as Process,
  speed: undefined as number | undefined,
  boxImageUrl: '',
})

const form = ref(emptyForm())

const sortedStocks = computed(() => {
  return stocks.value.slice().sort((a, b) => {
    const brandA = a.brand.toLowerCase()
    const brandB = b.brand.toLowerCase()
    if (brandA < brandB) return -1
    if (brandA > brandB) return 1
    return 0
  })
})

const closeModal = () => {
  showModal.value = false
  form.value = emptyForm()
  tagsInput.value = ''
  error.value = ''
}

const handleSubmit = async () => {
  submitting.value = true
  error.value = ''
  try {
    const tags = tagsInput.value
      ? tagsInput.value.split(',').map(t => t.trim()).filter(Boolean)
      : []
    const payload: Omit<Stock, '_key' | 'createdAt' | 'updatedAt'> = {
      brand: form.value.brand,
      manufacturer: form.value.manufacturer,
      formatKey: form.value.formatKey,
      process: form.value.process,
      speed: form.value.speed!,
      tags,
    }
    if (form.value.boxImageUrl) payload.boxImageUrl = form.value.boxImageUrl
    await stockApi.create(payload)
    await loadStocks()
    closeModal()
  } catch (e) {
    error.value = 'Failed to add stock. Please try again.'
  } finally {
    submitting.value = false
  }
}

const loadStocks = async () => {
  try {
    const response = await stockApi.getAll()
    stocks.value = response.data
  } catch (e) {
    console.error('Error loading stocks:', e)
  }
}

const loadFormats = async () => {
  try {
    const response = await filmFormatApi.getAll()
    formats.value = response.data
  } catch (e) {
    console.error('Error loading formats:', e)
  }
}

onMounted(() => {
  loadStocks()
  loadFormats()
})
</script>
