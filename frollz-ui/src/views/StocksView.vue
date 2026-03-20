<template>
  <div>
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Stocks</h1>
      <button @click="showModal = true" class="bg-primary-600 text-white px-4 py-2 min-h-[44px] rounded-md hover:bg-primary-700 font-medium">
        Add Stock
      </button>
    </div>

    <!-- Active Filters -->
    <div class="flex flex-wrap items-center gap-2 mb-4 min-h-[2rem]">
      <span class="text-sm text-gray-500 dark:text-gray-400 font-medium">Filters:</span>
      <span v-if="activeFilters.length === 0" class="text-sm text-gray-600 dark:text-gray-400 italic">
        <span class="hidden md:inline">Click any value in the table to filter by that field</span>
        <span class="md:hidden">No active filters</span>
      </span>
      <template v-else>
        <span
          v-for="(filter, index) in activeFilters"
          :key="index"
          class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200 font-medium"
        >
          {{ filter.label }}: {{ filter.value }}
          <button @click="removeFilter(index)" class="ml-1 inline-flex items-center justify-center min-h-[44px] min-w-[44px] text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-200 font-bold">&times;</button>
        </span>
        <button @click="clearFilters" class="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline">Clear all</button>
      </template>
    </div>

    <!-- Mobile card list (hidden on md+) -->
    <div class="md:hidden space-y-3" :aria-busy="isLoading" aria-label="Stocks list">
      <p v-if="sortedStocks.length === 0" class="text-center py-8 text-gray-600 dark:text-gray-400 italic">No stocks found.</p>
      <div
        v-for="stock in sortedStocks"
        :key="stock._key"
        class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4"
      >
        <div class="flex justify-between items-start gap-3">
          <div class="min-w-0">
            <p class="font-semibold text-gray-900 dark:text-gray-100 truncate">{{ stock.brand }}</p>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">{{ stock.manufacturer }}</p>
            <p class="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{{ stock.format }} · ISO {{ stock.speed }}</p>
          </div>
          <div class="flex flex-col items-end gap-2 shrink-0">
            <span class="px-2 text-xs leading-5 font-semibold rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">{{ stock.process }}</span>
            <button
              @click="createRoll(stock._key!)"
              class="bg-primary-600 text-white px-4 py-2 min-h-[44px] rounded-md hover:bg-primary-700 font-medium"
              title="Add roll from this stock"
              aria-label="Add roll from this stock"
            >Add Roll</button>
          </div>
        </div>
        <div v-if="stockTagMap[stock._key!]?.length" class="flex flex-wrap gap-1 mt-2">
          <span
            v-for="tag in stockTagMap[stock._key!]"
            :key="tag._key"
            class="px-2 py-0.5 rounded text-xs font-medium text-white"
            :style="{ backgroundColor: tag.color }"
          >{{ tag.value }}</span>
        </div>
      </div>
    </div>

    <!-- Desktop table (hidden below md) -->
    <div class="hidden md:block bg-white dark:bg-gray-800 rounded-lg shadow-md" :aria-busy="isLoading" aria-label="Stocks table">
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
                <!-- eslint-disable-next-line vuejs-accessibility/click-events-have-key-events, vuejs-accessibility/no-static-element-interactions -- filter chip; will be converted to a button in #202 -->
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
                  <!-- eslint-disable-next-line vuejs-accessibility/click-events-have-key-events, vuejs-accessibility/no-static-element-interactions -- filter chip; will be converted to a button in #202 -->
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
                  class="bg-primary-600 text-white px-4 py-2 min-h-[44px] rounded-md hover:bg-primary-700 font-medium"
                  title="Add roll from this stock"
                  aria-label="Add roll from this stock"
                >Add Roll</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Add Stock Modal -->
    <BaseModal :open="showModal" title-id="add-stock-title" @close="closeModal">
        <h2 id="add-stock-title" class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Add Stock</h2>
        <form @submit.prevent="handleSubmit">
          <div class="space-y-4">
            <div>
              <p class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Brand <span class="text-red-500" aria-hidden="true">*</span></p>
              <TypeaheadInput
                id="stock-brand"
                aria-label="Brand"
                aria-required="true"
                v-model="form.brand"
                :fetchOptions="(q) => stockApi.getBrands(q).then(r => r.data)"
                required
                placeholder="e.g. Portra 400"
                class="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
            <div>
              <p class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Manufacturer <span class="text-red-500" aria-hidden="true">*</span></p>
              <TypeaheadInput
                id="stock-manufacturer"
                aria-label="Manufacturer"
                aria-required="true"
                v-model="form.manufacturer"
                :fetchOptions="(q) => stockApi.getManufacturers(q).then(r => r.data)"
                required
                placeholder="e.g. Kodak"
                class="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
            <div>
              <label for="stock-process" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Process <span class="text-red-500" aria-hidden="true">*</span>
                <select
                  id="stock-process"
                  v-model="form.process"
                  required
                  aria-required="true"
                  class="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="" disabled>Select a process</option>
                  <option v-for="p in processOptions" :key="p" :value="p">{{ p }}</option>
                </select>
              </label>
            </div>
            <fieldset>
              <legend class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Formats <span class="text-red-500" aria-hidden="true">*</span></legend>
              <div class="flex flex-wrap gap-2 p-2 border border-gray-300 dark:border-gray-600 rounded-md min-h-[2.5rem] bg-white dark:bg-gray-700">
                <span v-if="!form.process" class="text-sm text-gray-600 dark:text-gray-400 italic">Select a process first</span>
                <label
                  v-else
                  v-for="fmt in filteredFormats"
                  :key="fmt._key"
                  :for="'format-check-' + fmt._key"
                  class="flex items-center gap-1 min-h-[44px] px-1 text-sm cursor-pointer text-gray-900 dark:text-gray-100"
                >
                  <input
                    :id="'format-check-' + fmt._key"
                    type="checkbox"
                    :value="fmt._key"
                    v-model="form.formatKeys"
                    class="rounded"
                  />
                  {{ fmt.format }}
                </label>
              </div>
            </fieldset>
            <div>
              <p class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Speed (ISO) <span class="text-red-500" aria-hidden="true">*</span></p>
              <SpeedTypeaheadInput
                id="stock-speed"
                aria-label="Speed (ISO)"
                aria-required="true"
                v-model="form.speed"
                :fetchOptions="(q: string) => stockApi.getSpeeds(q).then(r => r.data)"
                required
                min="1"
                placeholder="e.g. 400"
                class="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
            <div>
              <p class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags</p>
              <div class="flex flex-wrap gap-2 p-2 border border-gray-300 dark:border-gray-600 rounded-md min-h-[2.5rem] bg-white dark:bg-gray-700">
                <button
                  v-for="tag in stockScopedTags"
                  :key="tag._key"
                  type="button"
                  @click="toggleTag(tag._key!)"
                  class="px-3 py-2 min-h-[44px] rounded text-xs font-medium transition-opacity"
                  :class="selectedTagKeys.includes(tag._key!) ? 'opacity-100 text-white' : 'opacity-40 text-white'"
                  :style="{ backgroundColor: tag.color }"
                >
                  {{ tag.value }}
                </button>
              </div>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Click tags to select</p>
            </div>
            <div>
              <label for="stock-box-image-url" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Box Image URL
                  <input
                    id="stock-box-image-url"
                    v-model="form.boxImageUrl"
                    type="url"
                    placeholder="https://..."
                    class="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  />
              </label>
            </div>
          </div>
          <div v-if="error" role="alert" class="mt-4 text-sm text-red-600 dark:text-red-400">{{ error }}</div>
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
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { stockApi, filmFormatApi, tagApi, stockTagApi } from '@/services/api-client'
import type { Stock, FilmFormat, Tag } from '@/types'
import { Process, FormFactor } from '@/types'
import TypeaheadInput from '@/components/TypeaheadInput.vue'
import BaseModal from '@/components/BaseModal.vue'
import SpeedTypeaheadInput from '@/components/SpeedTypeaheadInput.vue'
import { useNotificationStore } from '@/stores/notification'

const router = useRouter()
const notification = useNotificationStore()

const stocks = ref<Stock[]>([])
const formats = ref<FilmFormat[]>([])
const allTags = ref<Tag[]>([])
// Map from stockKey -> Tag[]
const stockTagMap = ref<Record<string, Tag[]>>({})
const isLoading = ref(false)
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

const stockScopedTags = computed(() => allTags.value.filter(t => t.isStockScoped))

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
    notification.announce('Stock added')
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
  isLoading.value = true
  try {
    const response = await stockApi.getAll()
    stocks.value = response.data
    await buildStockTagMap()
  } catch (err) {
    console.error('Error loading stocks:', err)
  } finally {
    isLoading.value = false
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
