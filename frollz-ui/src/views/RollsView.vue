<template>
  <div>
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Rolls</h1>
      <button @click="openAddRoll()" class="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 font-medium">
        Add Roll
      </button>
    </div>

    <!-- Active Filters -->
    <div class="flex flex-wrap items-center gap-2 mb-4 min-h-[2rem]">
      <span class="text-sm text-gray-500 dark:text-gray-400 font-medium">Filters:</span>
      <span v-if="activeFilters.length === 0" class="text-sm text-gray-400 dark:text-gray-500 italic">
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
          <button @click="removeFilter(index)" class="ml-1 text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-200 font-bold leading-none">&times;</button>
        </span>
        <button @click="clearFilters" class="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline">Clear all</button>
      </template>
    </div>

    <!-- Mobile card list (hidden on md+) -->
    <div class="md:hidden space-y-3">
      <p v-if="filteredRolls.length === 0" class="text-center py-8 text-gray-400 dark:text-gray-500 italic">No rolls found.</p>
      <RouterLink
        v-for="roll in filteredRolls"
        :key="roll._key"
        :to="{ name: 'roll-detail', params: { key: roll._key } }"
        class="block bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow"
      >
        <div class="flex justify-between items-start gap-3">
          <div class="min-w-0">
            <p class="font-semibold text-primary-600 dark:text-primary-400 truncate">{{ roll.rollId }}</p>
            <p class="text-sm text-gray-600 dark:text-gray-300 mt-0.5 truncate">{{ roll.stockName ?? '—' }}</p>
            <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{{ roll.formatName ?? '—' }}</p>
          </div>
          <span
            class="shrink-0 px-2 text-xs leading-5 font-semibold rounded-full"
            :class="getStateColor(roll.state)"
          >{{ roll.state }}</span>
        </div>
        <p class="text-xs text-gray-400 dark:text-gray-500 mt-2">{{ formatDate(roll.dateObtained) }}</p>
      </RouterLink>
    </div>

    <!-- Desktop table (hidden below md) -->
    <div class="hidden md:block bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <div class="overflow-x-auto">
        <table class="min-w-full">
          <thead class="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th
                @click="setSort('rollId')"
                :class="['px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none', sortField === 'rollId' ? 'bg-gray-200 dark:bg-gray-600' : '']"
              >Roll ID {{ sortField === 'rollId' ? (sortDirection === 'asc' ? '↑' : '↓') : '' }}</th>
              <th
                @click="setSort('stockName')"
                :class="['px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none', sortField === 'stockName' ? 'bg-gray-200 dark:bg-gray-600' : '']"
              >Stock {{ sortField === 'stockName' ? (sortDirection === 'asc' ? '↑' : '↓') : '' }}</th>
              <th
                @click="setSort('formatName')"
                :class="['px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none', sortField === 'formatName' ? 'bg-gray-200 dark:bg-gray-600' : '']"
              >Format {{ sortField === 'formatName' ? (sortDirection === 'asc' ? '↑' : '↓') : '' }}</th>
              <th
                @click="setSort('state')"
                :class="['px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none', sortField === 'state' ? 'bg-gray-200 dark:bg-gray-600' : '']"
              >State {{ sortField === 'state' ? (sortDirection === 'asc' ? '↑' : '↓') : '' }}</th>
              <th
                @click="setSort('dateObtained')"
                :class="['px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none', sortField === 'dateObtained' ? 'bg-gray-200 dark:bg-gray-600' : '']"
              >Date Obtained {{ sortField === 'dateObtained' ? (sortDirection === 'asc' ? '↑' : '↓') : '' }}</th>
              <th
                @click="setSort('obtainedFrom')"
                :class="['px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none', sortField === 'obtainedFrom' ? 'bg-gray-200 dark:bg-gray-600' : '']"
              >Obtained From {{ sortField === 'obtainedFrom' ? (sortDirection === 'asc' ? '↑' : '↓') : '' }}</th>
              <th
                @click="setSort('timesExposedToXrays')"
                :class="['px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none', sortField === 'timesExposedToXrays' ? 'bg-gray-200 dark:bg-gray-600' : '']"
              >X-Ray Exposures {{ sortField === 'timesExposedToXrays' ? (sortDirection === 'asc' ? '↑' : '↓') : '' }}</th>
              <th class="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            <tr v-for="roll in filteredRolls" :key="roll._key">
              <td
                class="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-600 dark:text-primary-400 cursor-pointer hover:underline"
                @click="$router.push({ name: 'roll-detail', params: { key: roll._key } })"
              >{{ roll.rollId }}</td>
              <td
                class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 cursor-pointer hover:text-primary-600 dark:hover:text-primary-400"
                @click="roll.stockName && addFilter('stockName', 'Stock', roll.stockName)"
              >{{ roll.stockName ?? '—' }}</td>
              <td
                class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 cursor-pointer hover:text-primary-600 dark:hover:text-primary-400"
                @click="roll.formatName && addFilter('formatName', 'Format', roll.formatName)"
              >{{ roll.formatName ?? '—' }}</td>
              <td class="px-6 py-4 whitespace-nowrap">
                <!-- eslint-disable-next-line vuejs-accessibility/click-events-have-key-events, vuejs-accessibility/no-static-element-interactions -- filter chip; will be converted to a button in #202 -->
                <span
                  class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full cursor-pointer hover:opacity-80"
                  :class="getStateColor(roll.state)"
                  @click="addFilter('state', 'State', roll.state)"
                >{{ roll.state }}</span>
              </td>
              <td
                class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 cursor-pointer hover:text-primary-600 dark:hover:text-primary-400"
                @click="addFilter('dateObtained', 'Date Obtained', formatDate(roll.dateObtained))"
              >{{ formatDate(roll.dateObtained) }}</td>
              <td
                class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 cursor-pointer hover:text-primary-600 dark:hover:text-primary-400"
                @click="addFilter('obtainedFrom', 'Obtained From', roll.obtainedFrom)"
              >{{ roll.obtainedFrom }}</td>
              <td
                class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 cursor-pointer hover:text-primary-600 dark:hover:text-primary-400"
                @click="addFilter('timesExposedToXrays', 'X-Ray Exposures', String(roll.timesExposedToXrays))"
              >{{ roll.timesExposedToXrays }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-right">
                <button
                  @click="$router.push({ name: 'roll-detail', params: { key: roll._key } })"
                  class="px-3 py-1 text-xs font-medium text-primary-600 dark:text-primary-400 border border-primary-300 dark:border-primary-600 rounded hover:bg-primary-50 dark:hover:bg-primary-900/30"
                >View</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Add Roll Modal -->
    <div
      v-if="showModal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-roll-title"
      class="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-80 flex items-center justify-center z-50"
    >
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg mx-4 max-h-screen overflow-y-auto">
        <h2 id="add-roll-title" class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Add Roll</h2>
        <form @submit.prevent="handleSubmit">
          <div class="space-y-4">
            <!-- Bulk roll toggle -->
            <div class="flex items-center gap-3">
              <label for="roll-bulk-canister" class="flex items-center gap-2 cursor-pointer">
                <input id="roll-bulk-canister" v-model="form.isBulkRoll" type="checkbox" class="rounded" @change="onBulkRollToggle" />
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Bulk canister roll</span>
              </label>
              <span class="text-xs text-gray-400 dark:text-gray-500">(100ft spool or similar)</span>
            </div>

            <!-- Parent bulk roll selector (only for non-bulk rolls) -->
            <div v-if="!form.isBulkRoll">
              <label for="roll-parent" class="block text-sm font-medium text-gray-700 dark:text-gray-300">From bulk roll — optional
                <select
                  id="roll-parent"
                  v-model="form.parentRollId"
                  class="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  @change="onParentRollChange"
                >
                  <option value="">None — standalone roll</option>
                  <option v-for="roll in bulkRolls" :key="roll._key" :value="roll._key">
                    {{ roll.rollId }} — {{ roll.stockName ?? 'Unknown stock' }}
                  </option>
                </select>
              </label>
            </div>

            <!-- Stock selector: hidden when parent roll is selected (inherited) -->
            <div v-if="!form.parentRollId">
              <label for="roll-stock" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Stock <span class="text-red-500" aria-hidden="true">*</span>
                <select
                  id="roll-stock"
                  v-model="form.stockKey"
                  :required="!form.parentRollId"
                  aria-required="true"
                  class="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="" disabled>Select a stock</option>
                  <option v-for="stock in sortedStocks" :key="stock._key" :value="stock._key">
                    {{ stock.brand }} — {{ stock.manufacturer }} (ISO {{ stock.speed }})
                  </option>
                </select>
              </label>
            </div>
            <div v-else class="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded px-3 py-2">
              Stock inherited from parent bulk roll
            </div>
            <div>
              <label for="roll-initial-state" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Initial State <span class="text-red-500" aria-hidden="true">*</span>
                <select
                  id="roll-initial-state"
                  v-model="form.state"
                  required
                  aria-required="true"
                  class="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option v-for="s in rollStateOptions" :key="s" :value="s">{{ s }}</option>
                </select>
              </label>
            </div>
            <div>
              <label for="roll-date-obtained" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Date Obtained <span class="text-red-500" aria-hidden="true">*</span>
                <input
                  id="roll-date-obtained"
                  v-model="form.dateObtained"
                  type="date"
                  required
                  aria-required="true"
                  class="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </label>
            </div>
            <!-- Obtainment method/from/expiration: auto-set for child rolls -->
            <template v-if="!form.parentRollId">
              <div>
                <label for="roll-obtainment-method" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Obtainment Method <span class="text-red-500" aria-hidden="true">*</span>
                  <select
                    id="roll-obtainment-method"
                    v-model="form.obtainmentMethod"
                    required
                    aria-required="true"
                    class="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option v-for="m in obtainmentMethodOptions" :key="m" :value="m">{{ m }}</option>
                  </select>
                </label>
              </div>
              <div>
                <label for="roll-obtained-from" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Obtained From <span class="text-red-500" aria-hidden="true">*</span>
                  <input
                    id="roll-obtained-from"
                    v-model="form.obtainedFrom"
                    type="text"
                    required
                    aria-required="true"
                    placeholder="e.g. B&H Photo"
                    class="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </label>
              </div>
              <div>
                <label for="roll-expiration-date" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Expiration Date
                  <input
                    id="roll-expiration-date"
                    v-model="form.expirationDate"
                    type="date"
                    class="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </label>
              </div>
            </template>
            <div v-else class="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded px-3 py-2 space-y-1">
              <p>Obtainment: <span class="font-medium text-gray-700 dark:text-gray-300">Self Rolled</span></p>
              <p>Obtained from: <span class="font-medium text-gray-700 dark:text-gray-300">Bulk Roll (inherited)</span></p>
              <p>Expiration date: <span class="font-medium text-gray-700 dark:text-gray-300">Inherited from bulk roll</span></p>
            </div>
            <div>
              <label for="roll-xray-exposures" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Times Exposed to X-Rays
                <input
                  id="roll-xray-exposures"
                  v-model.number="form.timesExposedToXrays"
                  type="number"
                  min="0"
                  class="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
              {{ submitting ? 'Adding...' : 'Add Roll' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { rollApi, stockApi } from '@/services/api-client'
import type { Roll, Stock } from '@/types'
import { RollState, ObtainmentMethod } from '@/types'

const route = useRoute()
const router = useRouter()

const rolls = ref<Roll[]>([])
const stocks = ref<Stock[]>([])
const showModal = ref(false)

type ActiveFilter = { field: string; label: string; value: string }
const activeFilters = ref<ActiveFilter[]>([])

const addFilter = (field: string, label: string, value: string) => {
  if (!value) return
  if (!activeFilters.value.some(f => f.field === field && f.value === value)) {
    activeFilters.value.push({ field, label, value })
  }
}

const removeFilter = (index: number) => {
  activeFilters.value.splice(index, 1)
}

const clearFilters = () => {
  activeFilters.value = []
}
const submitting = ref(false)
const error = ref('')

const rollStateOptions = Object.values(RollState)
const obtainmentMethodOptions = Object.values(ObtainmentMethod)

type SortField = 'rollId' | 'stockName' | 'formatName' | 'state' | 'dateObtained' | 'obtainedFrom' | 'timesExposedToXrays'
const sortField = ref<SortField>('rollId')
const sortDirection = ref<'asc' | 'desc'>('asc')

const setSort = (field: SortField) => {
  if (sortField.value === field) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortDirection.value = 'asc'
  }
}

const today = new Date().toISOString().slice(0, 10)

const emptyForm = () => ({
  stockKey: '',
  state: RollState.ADDED,
  dateObtained: today,
  obtainmentMethod: ObtainmentMethod.PURCHASE,
  obtainedFrom: '',
  expirationDate: '',
  timesExposedToXrays: 0,
  isBulkRoll: false,
  parentRollId: '',
})

const form = ref(emptyForm())

const filteredRolls = computed(() => {
  const base = activeFilters.value.length === 0
    ? rolls.value
    : rolls.value.filter(roll =>
        activeFilters.value.every(f => {
          if (f.field === 'dateObtained') return formatDate(roll.dateObtained) === f.value
          if (f.field === 'timesExposedToXrays') return String(roll.timesExposedToXrays) === f.value
          return (roll[f.field as keyof Roll] ?? '') === f.value
        })
      )

  return base.slice().sort((a, b) => {
    let cmp: number
    if (sortField.value === 'timesExposedToXrays') {
      cmp = a.timesExposedToXrays - b.timesExposedToXrays
    } else if (sortField.value === 'dateObtained') {
      cmp = new Date(a.dateObtained).getTime() - new Date(b.dateObtained).getTime()
    } else {
      const aVal = (a[sortField.value] ?? '').toString().toLowerCase()
      const bVal = (b[sortField.value] ?? '').toString().toLowerCase()
      cmp = aVal.localeCompare(bVal)
    }
    return sortDirection.value === 'asc' ? cmp : -cmp
  })
})

const sortedStocks = computed(() => {
  return stocks.value.slice().sort((a, b) => a.brand.toLowerCase().localeCompare(b.brand.toLowerCase()))
})

const bulkRolls = computed(() =>
  rolls.value.filter(r => r.transitionProfile === 'bulk'),
)

const onBulkRollToggle = () => {
  if (form.value.isBulkRoll) {
    form.value.parentRollId = ''
  }
}

const onParentRollChange = () => {
  if (form.value.parentRollId) {
    form.value.stockKey = ''
  }
}

const formatDate = (date: Date | string) => {
  return new Date(date as string).toLocaleDateString()
}

const getStateColor = (state: RollState) => {
  const colors: Record<string, string> = {
    Added: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200',
    Frozen: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
    Refrigerated: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-200',
    Shelved: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    Loaded: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200',
    Finished: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',
    'Sent For Development': 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200',
    Developed: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200',
    Received: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200',
  }
  return colors[state] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
}

const closeModal = () => {
  showModal.value = false
  form.value = emptyForm()
  error.value = ''
}

const handleSubmit = async () => {
  submitting.value = true
  error.value = ''
  try {
    const payload: Parameters<typeof rollApi.create>[0] = {
      stockKey: form.value.parentRollId ? undefined : form.value.stockKey,
      state: form.value.state,
      dateObtained: new Date(form.value.dateObtained),
      obtainmentMethod: form.value.obtainmentMethod,
      obtainedFrom: form.value.obtainedFrom,
      timesExposedToXrays: form.value.timesExposedToXrays,
    }
    if (form.value.expirationDate) {
      payload.expirationDate = new Date(form.value.expirationDate)
    }
    if (form.value.isBulkRoll) {
      payload.isBulkRoll = true
    }
    if (form.value.parentRollId) {
      payload.parentRollId = form.value.parentRollId
    }
    const created = await rollApi.create(payload)
    closeModal()
    await router.push({ name: 'roll-detail', params: { key: created.data._key } })
  } catch {
    error.value = 'Failed to add roll. Please try again.'
  } finally {
    submitting.value = false
  }
}

const loadRolls = async () => {
  try {
    const response = await rollApi.getAll()
    rolls.value = response.data
  } catch (err) {
    console.error('Error loading rolls:', err)
  }
}

const loadStocks = async () => {
  try {
    const response = await stockApi.getAll()
    stocks.value = response.data
  } catch (err) {
    console.error('Error loading stocks:', err)
  }
}

const openAddRoll = (stockKey?: string) => {
  if (stockKey) {
    form.value.stockKey = stockKey
  }
  showModal.value = true
}

onMounted(async () => {
  await Promise.all([loadRolls(), loadStocks()])
  const stockKey = route.query.stockKey as string | undefined
  if (stockKey) {
    openAddRoll(stockKey)
  }
})
</script>
