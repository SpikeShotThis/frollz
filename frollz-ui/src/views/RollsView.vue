<template>
  <div>
    <div class="flex justify-between items-center mb-8">
      <h1 class="text-3xl font-bold text-gray-900">Rolls</h1>
      <button @click="openAddRoll()" class="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 font-medium">
        Add Roll
      </button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="relative">
        <select v-model="filterState" class="w-full border border-gray-300 rounded-md px-3 py-2">
          <option value="">All States</option>
          <option value="Frozen">Frozen</option>
          <option value="Refrigerated">Refrigerated</option>
          <option value="Shelved">Shelved</option>
          <option value="Loaded">Loaded</option>
          <option value="Finished">Finished</option>
          <option value="Developed">Developed</option>
        </select>
      </div>
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
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {{ roll.rollId }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                  :class="getStateColor(roll.state)"
                >
                  {{ roll.state }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatDate(roll.dateObtained) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ roll.obtainedFrom }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ roll.timesExposedToXrays }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right">
                <button
                  v-if="canLoad(roll.state)"
                  @click="openLoadModal(roll)"
                  class="px-3 py-1 text-xs font-medium text-yellow-700 border border-yellow-400 rounded hover:bg-yellow-50"
                >Load</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Load Roll Modal -->
    <div v-if="loadTarget" class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 class="text-xl font-bold text-gray-900 mb-4">Load Roll</h2>
        <form @submit.prevent="handleLoad">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              What will this roll be loaded into? <span class="text-red-500">*</span>
            </label>
            <input
              v-model="loadedInto"
              type="text"
              required
              placeholder="e.g. Nikon F3"
              class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div v-if="loadError" class="mt-3 text-sm text-red-600">{{ loadError }}</div>
          <div class="flex justify-end gap-3 mt-6">
            <button
              type="button"
              @click="closeLoadModal"
              class="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
            >Cancel</button>
            <button
              type="submit"
              :disabled="loadSubmitting"
              class="px-4 py-2 bg-yellow-600 text-white rounded-md text-sm hover:bg-yellow-700 disabled:opacity-50"
            >{{ loadSubmitting ? 'Loading...' : 'Load' }}</button>
          </div>
        </form>
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
import { rollApi, stockApi } from '@/services/api-client'
import type { Roll, Stock } from '@/types'
import { RollState, ObtainmentMethod } from '@/types'

const route = useRoute()

const rolls = ref<Roll[]>([])
const stocks = ref<Stock[]>([])
const filterState = ref('')
const showModal = ref(false)
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
  state: RollState.SHELFED,
  dateObtained: today,
  obtainmentMethod: ObtainmentMethod.PURCHASE,
  obtainedFrom: '',
  expirationDate: '',
  timesExposedToXrays: 0,
})

const form = ref(emptyForm())

const filteredRolls = computed(() => {
  const base = filterState.value
    ? rolls.value.filter(roll => roll.state === filterState.value)
    : rolls.value

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

const LOADABLE_STATES = new Set([RollState.FROZEN, RollState.REFRIGERATED, RollState.SHELFED])

const canLoad = (state: RollState) => LOADABLE_STATES.has(state)

const loadTarget = ref<Roll | null>(null)
const loadedInto = ref('')
const loadSubmitting = ref(false)
const loadError = ref('')

const openLoadModal = (roll: Roll) => {
  loadTarget.value = roll
  loadedInto.value = ''
  loadError.value = ''
}

const closeLoadModal = () => {
  loadTarget.value = null
}

const handleLoad = async () => {
  if (!loadTarget.value) return
  loadSubmitting.value = true
  loadError.value = ''
  try {
    await rollApi.update(loadTarget.value._key!, {
      state: RollState.LOADED,
      loadedInto: loadedInto.value,
    })
    closeLoadModal()
    await loadRolls()
  } catch (e) {
    loadError.value = 'Failed to load roll. Please try again.'
  } finally {
    loadSubmitting.value = false
  }
}

const getStateColor = (state: RollState) => {
  const colors: Record<string, string> = {
    Frozen: 'bg-blue-100 text-blue-800',
    Refrigerated: 'bg-cyan-100 text-cyan-800',
    Shelved: 'bg-gray-100 text-gray-800',
    Loaded: 'bg-yellow-100 text-yellow-800',
    Finished: 'bg-green-100 text-green-800',
    Developed: 'bg-purple-100 text-purple-800',
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
  } catch (e) {
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
