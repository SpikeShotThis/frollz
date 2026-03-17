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
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manufacturer</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Format</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Process</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Speed</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tags</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="stock in sortedStocks" :key="stock._key">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ stock.brand }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ stock.manufacturer }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ stock.format }}</td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                  {{ stock.process }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">ISO {{ stock.speed }}</td>
              <td class="px-6 py-4 text-sm text-gray-500">
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="tag in stockTagMap[stock._key!]"
                    :key="tag._key"
                    class="px-2 py-1 rounded text-xs font-medium text-white"
                    :style="{ backgroundColor: tag.color }"
                  >
                    {{ tag.value }}
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
              <TypeaheadInput
                v-model="form.brand"
                :fetchOptions="(q) => stockApi.getBrands(q).then(r => r.data)"
                required
                placeholder="e.g. Portra 400"
                class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Manufacturer <span class="text-red-500">*</span></label>
              <TypeaheadInput
                v-model="form.manufacturer"
                :fetchOptions="(q) => stockApi.getManufacturers(q).then(r => r.data)"
                required
                placeholder="e.g. Kodak"
                class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
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
              <label class="block text-sm font-medium text-gray-700 mb-1">Formats <span class="text-red-500">*</span></label>
              <div class="flex flex-wrap gap-2 p-2 border border-gray-300 rounded-md min-h-[2.5rem]">
                <span v-if="!form.process" class="text-sm text-gray-400 italic">Select a process first</span>
                <label
                  v-else
                  v-for="fmt in filteredFormats"
                  :key="fmt._key"
                  class="flex items-center gap-1 text-sm cursor-pointer"
                >
                  <input
                    type="checkbox"
                    :value="fmt._key"
                    v-model="form.formatKeys"
                    class="rounded"
                  />
                  {{ fmt.format }}
                </label>
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Speed (ISO) <span class="text-red-500">*</span></label>
              <SpeedTypeaheadInput
                v-model="form.speed"
                :fetchOptions="(q: string) => stockApi.getSpeeds(q).then(r => r.data)"
                required
                min="1"
                placeholder="e.g. 400"
                class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Tags</label>
              <div class="flex flex-wrap gap-2 p-2 border border-gray-300 rounded-md min-h-[2.5rem]">
                <button
                  v-for="tag in allTags"
                  :key="tag._key"
                  type="button"
                  @click="toggleTag(tag._key!)"
                  class="px-2 py-1 rounded text-xs font-medium transition-opacity"
                  :class="selectedTagKeys.includes(tag._key!) ? 'opacity-100 text-white' : 'opacity-40 text-white'"
                  :style="{ backgroundColor: tag.color }"
                >
                  {{ tag.value }}
                </button>
              </div>
              <p class="text-xs text-gray-500 mt-1">Click tags to select</p>
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
import { ref, onMounted, computed, watch } from 'vue'
import { stockApi, filmFormatApi, tagApi, stockTagApi } from '@/services/api-client'
import type { Stock, FilmFormat, Tag } from '@/types'
import { Process, FormFactor } from '@/types'
import TypeaheadInput from '@/components/TypeaheadInput.vue'
import SpeedTypeaheadInput from '@/components/SpeedTypeaheadInput.vue'

const stocks = ref<Stock[]>([])
const formats = ref<FilmFormat[]>([])
const allTags = ref<Tag[]>([])
// Map from stockKey -> Tag[]
const stockTagMap = ref<Record<string, Tag[]>>({})
const showModal = ref(false)
const submitting = ref(false)
const error = ref('')
const selectedTagKeys = ref<string[]>([])

const processOptions = Object.values(Process)

const emptyForm = () => ({
  brand: '',
  manufacturer: '',
  formatKeys: [] as string[],
  process: '' as Process,
  speed: undefined as number | undefined,
  boxImageUrl: '',
})

const form = ref(emptyForm())

const filteredFormats = computed(() => {
  if (!form.value.process) return []
  if (form.value.process === Process.INSTANT) {
    return formats.value.filter(f => f.formFactor === FormFactor.INSTANT)
  }
  return formats.value.filter(f => f.formFactor !== FormFactor.INSTANT)
})

watch(() => form.value.process, () => {
  form.value.formatKeys = []
})

const sortedStocks = computed(() => {
  return stocks.value.slice().sort((a, b) => {
    const brandA = a.brand.toLowerCase()
    const brandB = b.brand.toLowerCase()
    if (brandA < brandB) return -1
    if (brandA > brandB) return 1
    return 0
  })
})

const toggleTag = (tagKey: string) => {
  const idx = selectedTagKeys.value.indexOf(tagKey)
  if (idx === -1) {
    selectedTagKeys.value.push(tagKey)
  } else {
    selectedTagKeys.value.splice(idx, 1)
  }
}

const closeModal = () => {
  showModal.value = false
  form.value = emptyForm()
  selectedTagKeys.value = []
  error.value = ''
}

const handleSubmit = async () => {
  if (form.value.formatKeys.length === 0) {
    error.value = 'Please select at least one format'
    return
  }
  submitting.value = true
  error.value = ''
  try {
    const payload = {
      brand: form.value.brand,
      manufacturer: form.value.manufacturer,
      formatKeys: form.value.formatKeys,
      process: form.value.process,
      speed: form.value.speed!,
      ...(form.value.boxImageUrl ? { boxImageUrl: form.value.boxImageUrl } : {}),
    }

    const response = await stockApi.createMultipleFormats(payload)
    const createdStocks = response.data

    // Associate selected tags with all created stocks
    await Promise.all(
      createdStocks.flatMap(stock =>
        selectedTagKeys.value.map(tagKey =>
          stockTagApi.create({ stockKey: stock._key!, tagKey })
        )
      )
    )

    await loadStocks()
    closeModal()
  } catch (e) {
    error.value = 'Failed to add stock. Please try again.'
  } finally {
    submitting.value = false
  }
}

const buildStockTagMap = async () => {
  const [tagResponse, stockTagResponse] = await Promise.all([
    tagApi.getAll(),
    stockTagApi.getAll(),
  ])
  allTags.value = tagResponse.data

  const tagByKey: Record<string, Tag> = {}
  for (const t of tagResponse.data) {
    if (t._key) tagByKey[t._key] = t
  }

  const map: Record<string, Tag[]> = {}
  for (const st of stockTagResponse.data) {
    if (!map[st.stockKey]) map[st.stockKey] = []
    const tag = tagByKey[st.tagKey]
    if (tag) map[st.stockKey].push(tag)
  }
  stockTagMap.value = map
}

const loadStocks = async () => {
  try {
    const response = await stockApi.getAll()
    stocks.value = response.data
    await buildStockTagMap()
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
