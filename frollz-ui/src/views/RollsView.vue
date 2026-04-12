<template>
  <div>
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Films</h1>
      <button @click="openAddFilm()" class="bg-primary-600 text-white px-4 py-2 min-h-[44px] rounded-md hover:bg-primary-700 font-medium">
        Add Film
      </button>
    </div>

    <!-- State Filter (Multi-select) -->
    <div class="mb-4 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
      <div class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Filter by State
      </div>
      <div class="flex flex-wrap gap-2">
        <label
          v-for="state in filmStateOptions"
          :key="state"
          :for="`state-filter-${state}`"
          class="inline-flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer transition-colors"
          :class="selectedStates.includes(state)
            ? 'bg-primary-100 dark:bg-primary-900 border-primary-600 dark:border-primary-400 text-primary-800 dark:text-primary-200'
            : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'"
        >
          <input
            :id="`state-filter-${state}`"
            type="checkbox"
            :value="state"
            v-model="selectedStates"
            class="rounded text-primary-600 focus:ring-primary-500"
          />
          <span class="text-sm font-medium">{{ state }}</span>
        </label>
      </div>
      <div class="mt-2">
        <button
          v-if="selectedStates.length > 0"
          @click="clearStateFilter"
          class="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline"
        >
          Clear state filter
        </button>
      </div>
    </div>

    <!-- Emulsion / Format / Tag Filters -->
    <div class="mb-4 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label for="filter-emulsion" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Emulsion
            <select
              id="filter-emulsion"
              v-model="selectedEmulsionId"
              class="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option :value="null">All emulsions</option>
              <option v-for="emulsion in sortedEmulsions" :key="emulsion.id" :value="emulsion.id">
                {{ emulsion.brand }} — {{ emulsion.name }}
              </option>
            </select>
          </label>
        </div>
        <div>
          <label for="filter-format" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Format
            <select
              id="filter-format"
              v-model="selectedFormatId"
              class="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option :value="null">All formats</option>
              <option v-for="format in formats" :key="format.id" :value="format.id">{{ format.name }}</option>
            </select>
          </label>
        </div>
        <div>
          <div class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags</div>
          <div class="flex flex-wrap gap-2">
            <label
              v-for="tag in tags"
              :key="tag.id"
              :for="`tag-filter-${tag.id}`"
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border cursor-pointer text-sm transition-colors"
              :class="selectedTagIds.includes(tag.id)
                ? 'bg-primary-100 dark:bg-primary-900 border-primary-600 dark:border-primary-400 text-primary-800 dark:text-primary-200'
                : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'"
            >
              <input
                :id="`tag-filter-${tag.id}`"
                type="checkbox"
                :value="tag.id"
                v-model="selectedTagIds"
                class="rounded text-primary-600 focus:ring-primary-500"
              />
              <span
                class="inline-block w-2 h-2 rounded-full"
                :style="{ backgroundColor: tag.colorCode }"
              ></span>
              {{ tag.name }}
            </label>
          </div>
        </div>
      </div>
      <div class="mt-3 flex items-center gap-3">
        <button
          v-if="hasActiveFilters"
          @click="clearAllFilters"
          class="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline"
        >
          Clear all filters
        </button>
        <span v-if="hasActiveFilters" class="text-sm text-gray-600 dark:text-gray-400">
          Showing {{ filteredFilms.length }} film(s)
        </span>
      </div>
    </div>

    <!-- Mobile card list (hidden on md+) -->
    <div class="md:hidden space-y-3" :aria-busy="isLoading" aria-label="Films list">
      <!-- Skeleton -->
      <template v-if="isLoading">
        <div v-for="n in 5" :key="n" class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 animate-pulse">
          <div class="flex justify-between items-start gap-3">
            <div class="min-w-0 flex-1">
              <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
              <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
            <div class="h-5 bg-gray-200 dark:bg-gray-700 rounded-full w-20 shrink-0"></div>
          </div>
        </div>
      </template>
      <template v-else>
        <p v-if="filteredFilms.length === 0" class="text-center py-8 text-gray-600 dark:text-gray-400 italic">No films found.</p>
        <RouterLink
          v-for="film in filteredFilms"
          :key="film.id"
          :to="{ name: 'roll-detail', params: { key: film.id } }"
          class="block bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow"
        >
          <div class="flex justify-between items-start gap-3">
            <div class="min-w-0">
              <p class="font-semibold text-primary-600 dark:text-primary-400 truncate">{{ film.name }}</p>
              <p class="text-sm text-gray-600 dark:text-gray-300 mt-0.5 truncate">{{ film.emulsion?.brand ?? '—' }}</p>
            </div>
            <span
              class="shrink-0 px-2 text-xs leading-5 font-semibold rounded-full"
              :class="getStateColor(getStateName(film))"
            >{{ getStateName(film) || 'No state' }}</span>
          </div>
        </RouterLink>
      </template>
    </div>

    <!-- Desktop table (hidden below md) -->
    <div class="hidden md:block bg-white dark:bg-gray-800 rounded-lg shadow-md" :aria-busy="isLoading" aria-label="Films table">
      <div class="overflow-x-auto">
        <table class="min-w-full">
          <thead class="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none">Name</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none">Emulsion</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none">State</th>
              <th class="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            <!-- Skeleton -->
            <template v-if="isLoading">
              <tr v-for="n in 5" :key="n" class="animate-pulse">
                <td class="px-6 py-4"><div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-28"></div></td>
                <td class="px-6 py-4"><div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-36"></div></td>
                <td class="px-6 py-4"><div class="h-5 bg-gray-200 dark:bg-gray-700 rounded-full w-20"></div></td>
                <td class="px-6 py-4"></td>
              </tr>
            </template>
            <template v-else>
              <tr v-if="filteredFilms.length === 0">
                <td colspan="4" class="px-6 py-8 text-center text-sm text-gray-600 dark:text-gray-400 italic">No films found.</td>
              </tr>
              <tr v-for="film in filteredFilms" :key="film.id" v-memo="[film, film.states]">
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-600 dark:text-primary-400 cursor-pointer hover:underline"
                  @click="$router.push({ name: 'roll-detail', params: { key: film.id } })"
                >{{ film.name }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {{ film.emulsion?.brand ?? '—' }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span
                    class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                    :class="getStateColor(getStateName(film))"
                  >{{ getStateName(film) || 'No state' }}</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right">
                  <button
                    @click="$router.push({ name: 'roll-detail', params: { key: film.id } })"
                    class="px-3 py-2 min-h-[44px] text-xs font-medium text-primary-600 dark:text-primary-400 border border-primary-300 dark:border-primary-600 rounded hover:bg-primary-50 dark:hover:bg-primary-900/30"
                  >View</button>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Add Film Modal -->
    <BaseModal :open="showModal" title-id="add-film-title" @close="closeModal">
        <h2 id="add-film-title" class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Add Film</h2>
        <form @submit.prevent="handleSubmit">
          <div class="space-y-4">
            <div>
              <label for="film-name" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Name <span class="text-red-500" aria-hidden="true">*</span>
                <input
                  id="film-name"
                  v-model="form.name"
                  type="text"
                  required
                  aria-required="true"
                  placeholder="e.g. Roll 001"
                  class="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                />
              </label>
            </div>

            <!-- Bulk film toggle -->
            <div class="flex items-center gap-3">
              <label for="film-bulk-canister" class="flex items-center gap-2 cursor-pointer">
                <input id="film-bulk-canister" v-model="form.isBulkFilm" type="checkbox" class="rounded" @change="onBulkFilmToggle" />
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Bulk canister</span>
              </label>
              <span class="text-xs text-gray-600 dark:text-gray-400">(100ft spool or similar)</span>
            </div>

            <!-- Parent bulk film selector -->
            <div v-if="!form.isBulkFilm">
              <label for="film-parent" class="block text-sm font-medium text-gray-700 dark:text-gray-300">From bulk canister — optional
                <select
                  id="film-parent"
                  v-model="form.parentId"
                  class="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  @change="onParentFilmChange"
                >
                  <option value="">None — standalone</option>
                  <option v-for="film in bulkFilms" :key="film.id" :value="film.id">
                    {{ film.name }} — {{ film.emulsion?.brand ?? 'Unknown emulsion' }}
                  </option>
                </select>
              </label>
            </div>

            <!-- Emulsion selector: hidden when parent is selected -->
            <div v-if="!form.parentId">
              <label for="film-emulsion" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Emulsion <span class="text-red-500" aria-hidden="true">*</span>
                <select
                  id="film-emulsion"
                  v-model="form.emulsionId"
                  :required="!form.parentId"
                  aria-required="true"
                  class="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="" disabled>Select an emulsion</option>
                  <option v-for="emulsion in sortedEmulsions" :key="emulsion.id" :value="emulsion.id">
                    {{ emulsion.brand }} — {{ emulsion.manufacturer }} (ISO {{ emulsion.speed }})
                  </option>
                </select>
              </label>
            </div>
            <div v-else class="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded px-3 py-2">
              Emulsion inherited from parent bulk canister
            </div>

            <div>
              <label for="film-expiration-date" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Expiration Date
                <input
                  id="film-expiration-date"
                  v-model="form.expirationDate"
                  type="date"
                  class="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </label>
            </div>

            <div>
              <label for="film-profile" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Transition Profile <span class="text-red-500" aria-hidden="true">*</span>
                <select
                  id="film-profile"
                  v-model="form.transitionProfileId"
                  required
                  aria-required="true"
                  class="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="" disabled>Select a profile</option>
                  <option v-for="profile in transitionProfiles" :key="profile.id" :value="profile.id">{{ profile.name }}</option>
                </select>
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
              {{ submitting ? 'Adding...' : 'Add Film' }}
            </button>
          </div>
        </form>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { filmApi, emulsionApi, transitionApi, formatApi, tagApi } from '@/services/api-client'
import BaseModal from '@/components/BaseModal.vue'
import type { Film, Emulsion, TransitionProfile, Format, Tag } from '@/types'
import { currentStateName } from '@/types'
import { getStateColor } from '@/utils/stateColors'

const route = useRoute()
const router = useRouter()

const films = ref<Film[]>([])
const emulsions = ref<Emulsion[]>([])
const formats = ref<Format[]>([])
const tags = ref<Tag[]>([])
const transitionProfiles = ref<TransitionProfile[]>([])
const isLoading = ref(true)
const showModal = ref(false)

const selectedStates = ref<string[]>([])
const selectedEmulsionId = ref<number | null>(null)
const selectedFormatId = ref<number | null>(null)
const selectedTagIds = ref<number[]>([])

const submitting = ref(false)
const error = ref('')

// State names come from transition graph; use a static list for the filter UI
const filmStateOptions = [
  'Added', 'Frozen', 'Refrigerated', 'Shelved', 'Loaded',
  'Finished', 'Sent For Development', 'Developed', 'Received',
]

const hasActiveFilters = computed(() =>
  selectedStates.value.length > 0 ||
  selectedEmulsionId.value !== null ||
  selectedFormatId.value !== null ||
  selectedTagIds.value.length > 0,
)

const clearAllFilters = () => {
  selectedStates.value = []
  selectedEmulsionId.value = null
  selectedFormatId.value = null
  selectedTagIds.value = []
}

const clearStateFilter = () => { selectedStates.value = [] }

const getStateName = (film: Film): string => currentStateName(film)

const emptyForm = () => ({
  name: '',
  emulsionId: '',
  expirationDate: '',
  transitionProfileId: '' as string | number,
  isBulkFilm: false,
  parentId: '',
})

const form = ref(emptyForm())

const filteredFilms = computed(() => films.value)

const sortedEmulsions = computed(() =>
  emulsions.value.slice().sort((a, b) => a.brand.toLowerCase().localeCompare(b.brand.toLowerCase()))
)

const bulkprofileId = computed(() =>
  transitionProfiles.value.find(p => p.name === 'bulk')?.id ?? '',
)

const bulkFilms = computed(() =>
  films.value.filter(f => f.transitionProfileId === bulkprofileId.value)
)

const onBulkFilmToggle = () => {
  if (form.value.isBulkFilm) {
    form.value.parentId = ''
    form.value.transitionProfileId = bulkprofileId.value
  } else {
    const standardId = transitionProfiles.value.find(p => p.name === 'standard')?.id ?? ''
    form.value.transitionProfileId = standardId
  }
}

const onParentFilmChange = () => {
  if (form.value.parentId) {
    form.value.emulsionId = ''
  }
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
    const payload = {
      name: form.value.name,
      transitionProfileId: Number(form.value.transitionProfileId),
      ...(form.value.emulsionId ? { emulsionId: form.value.emulsionId } : {}),
      ...(form.value.expirationDate ? { expirationDate: form.value.expirationDate } : {}),
      ...(form.value.parentId ? { parentId: form.value.parentId } : {}),
    }
    const created = await filmApi.create(payload)
    closeModal()
    await router.push({ name: 'roll-detail', params: { key: created.data.id } })
  } catch {
    error.value = 'Failed to add film. Please try again.'
  } finally {
    submitting.value = false
  }
}

const loadFilms = async () => {
  isLoading.value = true
  try {
    const params: Parameters<typeof filmApi.getAll>[0] = {}
    if (selectedStates.value.length > 0) params.state = selectedStates.value
    if (selectedEmulsionId.value !== null) params.emulsionId = selectedEmulsionId.value
    if (selectedFormatId.value !== null) params.formatId = selectedFormatId.value
    if (selectedTagIds.value.length > 0) params.tagId = selectedTagIds.value
    const response = await filmApi.getAll(Object.keys(params).length > 0 ? params : undefined)
    films.value = response.data
  } catch (err) {
    console.error('Error loading films:', err)
  } finally {
    isLoading.value = false
  }
}

const updateUrlQueryParams = () => {
  const query: Record<string, string | string[]> = {}
  if (selectedStates.value.length > 0) query.state = selectedStates.value
  if (selectedEmulsionId.value !== null) query.emulsionId = String(selectedEmulsionId.value)
  if (selectedFormatId.value !== null) query.formatId = String(selectedFormatId.value)
  if (selectedTagIds.value.length > 0) query.tagId = selectedTagIds.value.map(String)
  router.replace({ query })
}

watch([selectedStates, selectedEmulsionId, selectedFormatId, selectedTagIds], () => {
  loadFilms()
  updateUrlQueryParams()
}, { deep: true })

const openAddFilm = (emulsionId?: string) => {
  if (emulsionId) form.value.emulsionId = emulsionId
  // Default to standard profile
  const standardId = transitionProfiles.value.find(p => p.name === 'standard')?.id ?? ''
  form.value.transitionProfileId = standardId
  showModal.value = true
}

onMounted(async () => {
  const stateParam = route.query.state
  if (stateParam) {
    const states = Array.isArray(stateParam) ? stateParam : [stateParam]
    selectedStates.value = states.filter((s): s is string => s !== null)
  }
  const emulsionIdParam = route.query.emulsionId
  if (emulsionIdParam && typeof emulsionIdParam === 'string') {
    selectedEmulsionId.value = parseInt(emulsionIdParam, 10) || null
  }
  const formatIdParam = route.query.formatId
  if (formatIdParam && typeof formatIdParam === 'string') {
    selectedFormatId.value = parseInt(formatIdParam, 10) || null
  }
  const tagIdParam = route.query.tagId
  if (tagIdParam) {
    const ids = Array.isArray(tagIdParam) ? tagIdParam : [tagIdParam]
    selectedTagIds.value = ids.map(Number).filter(Boolean)
  }

  await Promise.all([
    loadFilms(),
    emulsionApi.getAll().then(r => { emulsions.value = r.data }),
    formatApi.getAll().then(r => { formats.value = r.data }),
    tagApi.getAll().then(r => { tags.value = r.data }),
    transitionApi.getProfiles().then(r => { transitionProfiles.value = r.data }),
  ])

  const openWithEmulsionId = route.query.emulsionId as string | undefined
  if (openWithEmulsionId && selectedEmulsionId.value === null) openAddFilm(openWithEmulsionId)
})
</script>
