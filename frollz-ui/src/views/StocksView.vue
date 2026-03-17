<template>
  <div>
    <div class="flex justify-between items-center mb-8">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Stocks</h1>
      <button @click="showModal = true" class="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 font-medium">
        Add Stock
      </button>
    </div>

    <!-- Active Filters -->
    <div class="flex flex-wrap items-center gap-2 mb-4 min-h-[2rem]">
      <span class="text-sm text-gray-500 dark:text-gray-400 font-medium">Filters:</span>
      <span v-if="activeFilters.length === 0" class="text-sm text-gray-400 dark:text-gray-500 italic">
        Click any value in the table to filter by that field
      </span>
      <template v-else>
        <span
          v-for="(filter, index) in activeFilters"
          :key="index"
          class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200 font-medium"
        >
          {{ filter.label }}: {{ filter.value }}
          <button @click="removeFilter(index)" class="ml-1 text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-200 font-bold leading-none">&times;</button>
        </span>
        <button @click="clearFilters" class="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline">Clear all</button>
      </template>
    </div>

    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <div class="overflow-x-auto">
        <table class="min-w-full">
          <thead class="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th
                @click="setSort('brand')"
                :class="['px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none', sortField === 'brand' ? 'bg-gray-200 dark:bg-gray-600' : '']"
              >Brand {{ sortField === 'brand' ? (sortDirection === 'asc' ? '↑' : '↓') : '' }}</th>
              <th
                @click="setSort('manufacturer')"
                :class="['px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none', sortField === 'manufacturer' ? 'bg-gray-200 dark:bg-gray-600' : '']"
              >Manufacturer {{ sortField === 'manufacturer' ? (sortDirection === 'asc' ? '↑' : '↓') : '' }}</th>
              <th
                @click="setSort('format')"
                :class="['px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none', sortField === 'format' ? 'bg-gray-200 dark:bg-gray-600' : '']"
              >Format {{ sortField === 'format' ? (sortDirection === 'asc' ? '↑' : '↓') : '' }}</th>
              <th
                @click="setSort('process')"
                :class="['px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none', sortField === 'process' ? 'bg-gray-200 dark:bg-gray-600' : '']"
              >Process {{ sortField === 'process' ? (sortDirection === 'asc' ? '↑' : '↓') : '' }}</th>
              <th
                @click="setSort('speed')"
                :class="['px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none', sortField === 'speed' ? 'bg-gray-200 dark:bg-gray-600' : '']"
              >Speed {{ sortField === 'speed' ? (sortDirection === 'asc' ? '↑' : '↓') : '' }}</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tags</th>
              <th class="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            <tr v-for="stock in sortedStocks" :key="stock._key">
              <td
                class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer hover:text-primary-600 dark:hover:text-primary-400"
                @click="addFilter('brand', 'Brand', stock.brand)"
              >{{ stock.brand }}</td>
              <td
                class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 cursor-pointer hover:text-primary-600 dark:hover:text-primary-400"
                @click="addFilter('manufacturer', 'Manufacturer', stock.manufacturer)"
              >{{ stock.manufacturer }}</td>
              <td
                class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 cursor-pointer hover:text-primary-600 dark:hover:text-primary-400"
                @click="addFilter('format', 'Format', stock.format ?? '')"
              >{{ stock.format }}</td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800"
                  @click="addFilter('process', 'Process', stock.process)"
                >
                  {{ stock.process }}
                </span>
              </td>
              <td
                class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 cursor-pointer hover:text-primary-600 dark:hover:text-primary-400"
                @click="addFilter('speed', 'Speed', String(stock.speed))"
              >ISO {{ stock.speed }}</td>
              <td class="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="tag in stockTagMap[stock._key!]"
                    :key="tag._key"
                    class="px-2 py-1 rounded text-xs font-medium text-white cursor-pointer hover:opacity-80"
                    :style="{ backgroundColor: tag.color }"
                    @click="addFilter('tag', 'Tag', tag.value)"
                  >
                    {{ tag.value }}
                  </span>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right">
                <button
                  @click="createRoll(stock._key!)"
                  class="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200 font-bold text-lg leading-none"
                  title="Add roll from this stock"
                >+</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Add Stock Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-80 flex items-center justify-center z-50">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg max-h-screen overflow-y-auto">
        <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Add Stock</h2>
        <form @submit.prevent="handleSubmit">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Brand <span class="text-red-500">*</span></label>
              <TypeaheadInput
                v-model="form.brand"
                :fetchOptions="(q) => stockApi.getBrands(q).then(r => r.data)"
                required
                placeholder="e.g. Portra 400"
                class="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Manufacturer <span class="text-red-500">*</span></label>
              <TypeaheadInput
                v-model="form.manufacturer"
                :fetchOptions="(q) => stockApi.getManufacturers(q).then(r => r.data)"
                required
                placeholder="e.g. Kodak"
                class="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Process <span class="text-red-500">*</span></label>
              <select
                v-model="form.process"
                required
                class="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="" disabled>Select a process</option>
                <option v-for="p in processOptions" :key="p" :value="p">{{ p }}</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Formats <span class="text-red-500">*</span></label>
              <div class="flex flex-wrap gap-2 p-2 border border-gray-300 dark:border-gray-600 rounded-md min-h-[2.5rem] bg-white dark:bg-gray-700">
                <span v-if="!form.process" class="text-sm text-gray-400 dark:text-gray-500 italic">Select a process first</span>
                <label
                  v-else
                  v-for="fmt in filteredFormats"
                  :key="fmt._key"
                  class="flex items-center gap-1 text-sm cursor-pointer text-gray-900 dark:text-gray-100"
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
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Speed (ISO) <span class="text-red-500">*</span></label>
              <SpeedTypeaheadInput
                v-model="form.speed"
                :fetchOptions="(q: string) => stockApi.getSpeeds(q).then(r => r.data)"
                required
                min="1"
                placeholder="e.g. 400"
                class="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags</label>
              <div class="flex flex-wrap gap-2 p-2 border border-gray-300 dark:border-gray-600 rounded-md min-h-[2.5rem] bg-white dark:bg-gray-700">
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
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Click tags to select</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Box Image URL</label>
              <input
                v-model="form.boxImageUrl"
                type="url"
                placeholder="https://..."
                class="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
          </div>
          <div v-if="error" class="mt-4 text-sm text-red-600 dark:text-red-400">{{ error }}</div>
          <div class="flex justify-end gap-3 mt-6">
            <button
              type="button"
              @click="closeModal"
              class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
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
import { useRouter } from 'vue-router'
import { stockApi, filmFormatApi, tagApi, stockTagApi } from '@/services/api-client'
import type { Stock, FilmFormat, Tag } from '@/types'
import { Process, FormFactor } from '@/types'
import TypeaheadInput from '@/components/TypeaheadInput.vue'
import SpeedTypeaheadInput from '@/components/SpeedTypeaheadInput.vue'

const router = useRouter()

const stocks = ref<Stock[]>([])
const formats = ref<FilmFormat[]>([])
const allTags = ref<Tag[]>([])
// Map from stockKey -> Tag[]
const stockTagMap = ref<Record<string, Tag[]>>({})
const showModal = ref(false)
const submitting = ref(false)
const error = ref('')
const selectedTagKeys = ref<string[]>([])

type SortField = 'brand' | 'manufacturer' | 'format' | 'process' | 'speed'
const sortField = ref<SortField>('brand')
const sortDirection = ref<'asc' | 'desc'>('asc')

const setSort = (field: SortField) => {
  if (sortField.value === field) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortDirection.value = 'asc'
  }
}

type ActiveFilter = { field: string; label: string; value: string }
const activeFilters = ref<ActiveFilter[]>([])

const addFilter = (field: string, label: string, value: string) => {
  if (!value) return
  const exists = activeFilters.value.some(f => f.field === field && f.value === value)
  if (!exists) {
    activeFilters.value.push({ field, label, value })
  }
}

const removeFilter = (index: number) => {
  activeFilters.value.splice(index, 1)
}

const clearFilters = () => {
  activeFilters.value = []
}

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

const filteredAndSortedStocks = computed(() => {
  let result = stocks.value
  if (activeFilters.value.length > 0) {
    result = result.filter(stock => {
      return activeFilters.value.every(filter => {
        if (filter.field === 'tag') {
          const tags = stockTagMap.value[stock._key!] ?? []
          return tags.some(t => t.value === filter.value)
        }
        if (filter.field === 'speed') {
          return String(stock.speed) === filter.value
        }
        return (stock[filter.field as keyof Stock] ?? '') === filter.value
      })
    })
  }
  return result.slice().sort((a, b) => {
    let cmp: number
    if (sortField.value === 'speed') {
      cmp = (a.speed ?? 0) - (b.speed ?? 0)
    } else {
      const aVal = (a[sortField.value] ?? '').toString().toLowerCase()
      const bVal = (b[sortField.value] ?? '').toString().toLowerCase()
      cmp = aVal.localeCompare(bVal)
    }
    return sortDirection.value === 'asc' ? cmp : -cmp
  })
})

// Keep sortedStocks as an alias for backwards compatibility with tests
const sortedStocks = filteredAndSortedStocks

const toggleTag = (tagKey: string) => {
  const idx = selectedTagKeys.value.indexOf(tagKey)
  if (idx === -1) {
    selectedTagKeys.value.push(tagKey)
  } else {
    selectedTagKeys.value.splice(idx, 1)
  }
}

const createRoll = (stockKey: string) => {
  router.push({ name: 'rolls', query: { stockKey } })
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
  } catch (_) {
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
  } catch (err) {
    console.error('Error loading stocks:', err)
  }
}

const loadFormats = async () => {
  try {
    const response = await filmFormatApi.getAll()
    formats.value = response.data
  } catch (err) {
    console.error('Error loading formats:', err)
  }
}

onMounted(() => {
  loadStocks()
  loadFormats()
})
</script>
