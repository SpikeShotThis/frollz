<template>
  <div>
    <div class="flex justify-between items-center mb-8">
      <h1 class="text-3xl font-bold text-gray-900">Rolls</h1>
      <button @click="openAddRoll()" class="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 font-medium">
        Add Roll
      </button>
    </div>

    <!-- Active Filters -->
    <div class="flex flex-wrap items-center gap-2 mb-4 min-h-[2rem]">
      <span class="text-sm text-gray-500 font-medium">Filters:</span>
      <span v-if="activeFilters.length === 0" class="text-sm text-gray-400 italic">
        Click any value in the table to filter by that field
      </span>
      <template v-else>
        <span
          v-for="(filter, index) in activeFilters"
          :key="index"
          class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-primary-100 text-primary-800 font-medium"
        >
          {{ filter.label }}: {{ filter.value }}
          <button @click="removeFilter(index)" class="ml-1 text-primary-600 hover:text-primary-900 font-bold leading-none">&times;</button>
        </span>
        <button @click="clearFilters" class="text-sm text-gray-500 hover:text-gray-700 underline">Clear all</button>
      </template>
    </div>

    <div class="bg-white rounded-lg shadow-md">
      <div class="overflow-x-auto">
        <table class="min-w-full">
          <thead class="bg-gray-50">
            <tr>
              <th
                @click="setSort('rollId')"
                :class="['px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none', sortField === 'rollId' ? 'bg-gray-200' : '']"
              >Roll ID {{ sortField === 'rollId' ? (sortDirection === 'asc' ? '↑' : '↓') : '' }}</th>
              <th
                @click="setSort('state')"
                :class="['px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none', sortField === 'state' ? 'bg-gray-200' : '']"
              >State {{ sortField === 'state' ? (sortDirection === 'asc' ? '↑' : '↓') : '' }}</th>
              <th
                @click="setSort('dateObtained')"
                :class="['px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none', sortField === 'dateObtained' ? 'bg-gray-200' : '']"
              >Date Obtained {{ sortField === 'dateObtained' ? (sortDirection === 'asc' ? '↑' : '↓') : '' }}</th>
              <th
                @click="setSort('obtainedFrom')"
                :class="['px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none', sortField === 'obtainedFrom' ? 'bg-gray-200' : '']"
              >Obtained From {{ sortField === 'obtainedFrom' ? (sortDirection === 'asc' ? '↑' : '↓') : '' }}</th>
              <th
                @click="setSort('timesExposedToXrays')"
                :class="['px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none', sortField === 'timesExposedToXrays' ? 'bg-gray-200' : '']"
              >X-Ray Exposures {{ sortField === 'timesExposedToXrays' ? (sortDirection === 'asc' ? '↑' : '↓') : '' }}</th>
              <th class="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="roll in filteredRolls" :key="roll._key">
              <td
                class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 cursor-pointer hover:text-primary-600"
                @click="addFilter('rollId', 'Roll ID', roll.rollId)"
              >{{ roll.rollId }}</td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full cursor-pointer hover:opacity-80"
                  :class="getStateColor(roll.state)"
                  @click="addFilter('state', 'State', roll.state)"
                >{{ roll.state }}</span>
              </td>
              <td
                class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 cursor-pointer hover:text-primary-600"
                @click="addFilter('dateObtained', 'Date Obtained', formatDate(roll.dateObtained))"
              >{{ formatDate(roll.dateObtained) }}</td>
              <td
                class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 cursor-pointer hover:text-primary-600"
                @click="addFilter('obtainedFrom', 'Obtained From', roll.obtainedFrom)"
              >{{ roll.obtainedFrom }}</td>
              <td
                class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 cursor-pointer hover:text-primary-600"
                @click="addFilter('timesExposedToXrays', 'X-Ray Exposures', String(roll.timesExposedToXrays))"
              >{{ roll.timesExposedToXrays }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-right">
                <div class="flex items-center justify-end gap-2">
                  <!-- State transition buttons -->
                  <button
                    v-for="targetState in getValidTransitions(roll.state)"
                    :key="targetState"
                    @click="openTransitionModal(roll, targetState)"
                    class="px-3 py-1 text-xs font-medium border rounded hover:opacity-80"
                    :class="getTransitionButtonColor(targetState)"
                  >{{ targetState }}</button>
                  <!-- History button -->
                  <button
                    @click="openHistoryModal(roll)"
                    class="px-3 py-1 text-xs font-medium text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                    title="View state history"
                  >History</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Transition Modal -->
    <div v-if="transitionTarget" class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 class="text-xl font-bold text-gray-900 mb-1">Transition Roll</h2>
        <p class="text-sm text-gray-500 mb-4">
          Moving <span class="font-medium text-gray-700">{{ transitionTarget.roll.rollId }}</span>
          from <span class="font-medium">{{ transitionTarget.roll.state }}</span>
          to <span class="font-medium">{{ transitionTarget.targetState }}</span>
        </p>
        <form @submit.prevent="handleTransition">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              v-model="transitionNotes"
              rows="3"
              placeholder="Add any notes about this transition..."
              class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            ></textarea>
          </div>
          <div v-if="transitionError" class="mt-3 text-sm text-red-600">{{ transitionError }}</div>
          <div class="flex justify-end gap-3 mt-6">
            <button
              type="button"
              @click="closeTransitionModal"
              class="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
            >Cancel</button>
            <button
              type="submit"
              :disabled="transitionSubmitting"
              class="px-4 py-2 bg-primary-600 text-white rounded-md text-sm hover:bg-primary-700 disabled:opacity-50"
            >{{ transitionSubmitting ? 'Saving...' : 'Save' }}</button>
          </div>
        </form>
      </div>
    </div>

    <!-- History Modal -->
    <div v-if="historyTarget" class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg max-h-screen overflow-y-auto">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold text-gray-900">State History</h2>
          <button @click="closeHistoryModal" class="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <p class="text-sm text-gray-500 mb-4">{{ historyTarget.rollId }}</p>
        <div v-if="historyLoading" class="text-sm text-gray-400 py-4 text-center">Loading...</div>
        <div v-else-if="historyEntries.length === 0" class="text-sm text-gray-400 py-4 text-center">No history recorded yet.</div>
        <ol v-else class="relative border-l border-gray-200 ml-3">
          <li v-for="entry in historyEntries" :key="entry.stateId" class="mb-6 ml-4">
            <div class="absolute -left-1.5 w-3 h-3 rounded-full border border-white" :class="getStateColor(entry.state).replace('text-', 'bg-').split(' ')[0]"></div>
            <div class="flex items-center gap-2">
              <span
                class="px-2 text-xs leading-5 font-semibold rounded-full"
                :class="getStateColor(entry.state)"
              >{{ entry.state }}</span>
              <time class="text-xs text-gray-400">{{ formatDateTime(entry.date) }}</time>
            </div>
            <p v-if="entry.notes" class="mt-1 text-sm text-gray-600">{{ entry.notes }}</p>
          </li>
        </ol>
      </div>
    </div>

    <!-- Add Roll Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg max-h-screen overflow-y-auto">
        <h2 class="text-xl font-bold text-gray-900 mb-4">Add Roll</h2>
        <form @submit.prevent="handleSubmit">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Roll ID <span class="text-red-500">*</span></label>
              <input
                v-model="form.rollId"
                type="text"
                required
                class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Stock <span class="text-red-500">*</span></label>
              <select
                v-model="form.stockKey"
                required
                class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="" disabled>Select a stock</option>
                <option v-for="stock in sortedStocks" :key="stock._key" :value="stock._key">
                  {{ stock.brand }} — {{ stock.manufacturer }} (ISO {{ stock.speed }})
                </option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Initial State <span class="text-red-500">*</span></label>
              <select
                v-model="form.state"
                required
                class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option v-for="s in rollStateOptions" :key="s" :value="s">{{ s }}</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Date Obtained <span class="text-red-500">*</span></label>
              <input
                v-model="form.dateObtained"
                type="date"
                required
                class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Obtainment Method <span class="text-red-500">*</span></label>
              <select
                v-model="form.obtainmentMethod"
                required
                class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option v-for="m in obtainmentMethodOptions" :key="m" :value="m">{{ m }}</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Obtained From <span class="text-red-500">*</span></label>
              <input
                v-model="form.obtainedFrom"
                type="text"
                required
                placeholder="e.g. B&H Photo"
                class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Expiration Date</label>
              <input
                v-model="form.expirationDate"
                type="date"
                class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Times Exposed to X-Rays</label>
              <input
                v-model.number="form.timesExposedToXrays"
                type="number"
                min="0"
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
import { useRoute } from 'vue-router'
import { rollApi, rollStateApi, stockApi } from '@/services/api-client'
import type { Roll, RollStateHistory, Stock } from '@/types'
import { RollState, ObtainmentMethod } from '@/types'

const route = useRoute()

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

type SortField = 'rollId' | 'state' | 'dateObtained' | 'obtainedFrom' | 'timesExposedToXrays'
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
  rollId: '',
  stockKey: '',
  state: RollState.ADDED,
  dateObtained: today,
  obtainmentMethod: ObtainmentMethod.PURCHASE,
  obtainedFrom: '',
  expirationDate: '',
  timesExposedToXrays: 0,
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
      cmp = new Date(a.dateObtained as string).getTime() - new Date(b.dateObtained as string).getTime()
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

const formatDate = (date: Date | string) => {
  return new Date(date as string).toLocaleDateString()
}

const formatDateTime = (date: Date | string) => {
  return new Date(date as string).toLocaleString()
}

// Unified state machine transitions (storage + usage)
const VALID_TRANSITIONS: Partial<Record<RollState, RollState[]>> = {
  [RollState.ADDED]: [RollState.FROZEN, RollState.REFRIGERATED, RollState.SHELFED],
  [RollState.FROZEN]: [RollState.REFRIGERATED, RollState.SHELFED, RollState.ADDED],
  [RollState.REFRIGERATED]: [RollState.SHELFED, RollState.ADDED],
  [RollState.SHELFED]: [RollState.LOADED],
  [RollState.LOADED]: [RollState.FINISHED, RollState.SHELFED],
  [RollState.FINISHED]: [RollState.SENT_FOR_DEVELOPMENT, RollState.LOADED],
  [RollState.SENT_FOR_DEVELOPMENT]: [RollState.DEVELOPED, RollState.FINISHED],
  [RollState.DEVELOPED]: [RollState.RECEIVED, RollState.SENT_FOR_DEVELOPMENT],
  [RollState.RECEIVED]: [RollState.DEVELOPED],
}

const getValidTransitions = (state: RollState): RollState[] => {
  return VALID_TRANSITIONS[state] ?? []
}

const TRANSITION_BUTTON_COLORS: Partial<Record<RollState, string>> = {
  [RollState.ADDED]: 'text-gray-600 border-gray-400 hover:bg-gray-50',
  [RollState.FROZEN]: 'text-blue-700 border-blue-400 hover:bg-blue-50',
  [RollState.REFRIGERATED]: 'text-cyan-700 border-cyan-400 hover:bg-cyan-50',
  [RollState.SHELFED]: 'text-gray-600 border-gray-400 hover:bg-gray-50',
  [RollState.LOADED]: 'text-yellow-700 border-yellow-400 hover:bg-yellow-50',
  [RollState.FINISHED]: 'text-green-700 border-green-400 hover:bg-green-50',
  [RollState.SENT_FOR_DEVELOPMENT]: 'text-orange-700 border-orange-400 hover:bg-orange-50',
  [RollState.DEVELOPED]: 'text-purple-700 border-purple-400 hover:bg-purple-50',
  [RollState.RECEIVED]: 'text-indigo-700 border-indigo-400 hover:bg-indigo-50',
}

const getTransitionButtonColor = (state: RollState): string => {
  return TRANSITION_BUTTON_COLORS[state] ?? 'text-gray-600 border-gray-300 hover:bg-gray-50'
}

// Transition modal
type TransitionTarget = { roll: Roll; targetState: RollState }
const transitionTarget = ref<TransitionTarget | null>(null)
const transitionNotes = ref('')
const transitionSubmitting = ref(false)
const transitionError = ref('')

const openTransitionModal = (roll: Roll, targetState: RollState) => {
  transitionTarget.value = { roll, targetState }
  transitionNotes.value = ''
  transitionError.value = ''
}

const closeTransitionModal = () => {
  transitionTarget.value = null
}

const handleTransition = async () => {
  if (!transitionTarget.value) return
  transitionSubmitting.value = true
  transitionError.value = ''
  try {
    await rollApi.transition(
      transitionTarget.value.roll._key!,
      transitionTarget.value.targetState,
      transitionNotes.value || undefined,
    )
    closeTransitionModal()
    await loadRolls()
  } catch {
    transitionError.value = 'Failed to transition roll. Please try again.'
  } finally {
    transitionSubmitting.value = false
  }
}

// History modal
const historyTarget = ref<Roll | null>(null)
const historyEntries = ref<RollStateHistory[]>([])
const historyLoading = ref(false)

const openHistoryModal = async (roll: Roll) => {
  historyTarget.value = roll
  historyEntries.value = []
  historyLoading.value = true
  try {
    const response = await rollStateApi.getHistory(roll._key!)
    historyEntries.value = response.data
  } finally {
    historyLoading.value = false
  }
}

const closeHistoryModal = () => {
  historyTarget.value = null
}

const getStateColor = (state: RollState) => {
  const colors: Record<string, string> = {
    Added: 'bg-orange-100 text-orange-800',
    Frozen: 'bg-blue-100 text-blue-800',
    Refrigerated: 'bg-cyan-100 text-cyan-800',
    Shelved: 'bg-gray-100 text-gray-800',
    Loaded: 'bg-yellow-100 text-yellow-800',
    Finished: 'bg-green-100 text-green-800',
    'Sent For Development': 'bg-orange-100 text-orange-800',
    Developed: 'bg-purple-100 text-purple-800',
    Received: 'bg-indigo-100 text-indigo-800',
  }
  return colors[state] || 'bg-gray-100 text-gray-800'
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
    const payload: Omit<Roll, '_key' | 'createdAt' | 'updatedAt'> = {
      rollId: form.value.rollId,
      stockKey: form.value.stockKey,
      state: form.value.state,
      dateObtained: new Date(form.value.dateObtained),
      obtainmentMethod: form.value.obtainmentMethod,
      obtainedFrom: form.value.obtainedFrom,
      timesExposedToXrays: form.value.timesExposedToXrays,
    }
    if (form.value.expirationDate) {
      payload.expirationDate = new Date(form.value.expirationDate)
    }
    await rollApi.create(payload)
    await loadRolls()
    closeModal()
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
  } catch (e) {
    console.error('Error loading rolls:', e)
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

const openAddRoll = async (stockKey?: string) => {
  const nextId = await rollApi.getNextId()
  form.value.rollId = nextId.data
  if (stockKey) {
    form.value.stockKey = stockKey
  }
  showModal.value = true
}

onMounted(async () => {
  await Promise.all([loadRolls(), loadStocks()])
  const stockKey = route.query.stockKey as string | undefined
  if (stockKey) {
    await openAddRoll(stockKey)
  }
})
</script>
