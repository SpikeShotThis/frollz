<template>
  <div>
    <div class="mb-6">
      <button
        @click="$router.push({ name: 'films' })"
        class="inline-flex items-center min-h-[44px] text-sm text-primary-600 dark:text-primary-400 hover:underline"
      >← Back to Films</button>
    </div>

    <div v-if="loading" role="status" aria-label="Loading film detail" class="text-center py-12 text-gray-600 dark:text-gray-400">Loading...</div>

    <div v-else-if="!film" class="text-center py-12 text-gray-600 dark:text-gray-400">Film not found.</div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Left: Details + Tags + Transitions -->
      <div class="space-y-6">
        <!-- Film header -->
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">{{ film.name }}</h1>
          <span
            class="mt-2 inline-block px-2 text-xs leading-5 font-semibold rounded-full"
            :class="getStateColor(stateName)"
          >{{ stateName || 'No state' }}</span>
        </div>

        <!-- Parent bulk link (child films only) -->
        <div v-if="parentFilm" class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Cut from bulk canister
            <button
              @click="router.push({ name: 'film-detail', params: { key: parentFilm.id } })"
              class="inline-flex items-center min-h-[44px] px-1 text-primary-600 dark:text-primary-400 hover:underline font-medium ml-1"
            >{{ parentFilm.name }}</button>
          </p>
        </div>

        <!-- Details card -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Details</h2>
          <dl class="space-y-3">
            <div v-if="film.emulsion" class="flex justify-between text-sm">
              <dt class="text-gray-500 dark:text-gray-400">Emulsion</dt>
              <dd class="text-gray-900 dark:text-gray-100">
                {{ film.emulsion.brand }}
                <span class="text-gray-500 dark:text-gray-400"> ISO {{ film.emulsion.speed }}</span>
              </dd>
            </div>
            <div v-if="film.expirationDate" class="flex justify-between text-sm">
              <dt class="text-gray-500 dark:text-gray-400">Expiration Date</dt>
              <dd class="text-gray-900 dark:text-gray-100">{{ formatDate(film.expirationDate) }}</dd>
            </div>
          </dl>
        </div>

        <!-- Transitions card -->
        <div v-if="validTransitions.length > 0" class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Transitions</h2>
          <div class="space-y-3">
            <div class="flex flex-col sm:flex-row sm:flex-wrap gap-2">
              <button
                v-for="targetState in validTransitions"
                :key="targetState"
                @click="handleTransition(targetState)"
                :disabled="transitionSubmitting"
                class="w-full sm:w-auto px-4 py-2 sm:px-3 sm:py-2 min-h-[44px] text-sm font-medium border rounded disabled:opacity-50"
                :class="isBackwardTransition(stateName, targetState)
                  ? 'text-orange-700 border-orange-400 hover:bg-orange-50 dark:text-orange-400 dark:border-orange-500 dark:hover:bg-orange-900/30'
                  : 'bg-primary-600 text-white border-primary-600 hover:bg-primary-700 dark:bg-primary-700 dark:border-primary-700 dark:hover:bg-primary-800'"
              >
                {{ isBackwardTransition(stateName, targetState) ? '↩ ' : '' }}{{ targetState }}
              </button>
            </div>

            <!-- Date + note + metadata form -->
            <div v-if="pendingTransition" class="border border-blue-300 dark:border-blue-600 rounded-md p-3 bg-blue-50 dark:bg-blue-900/20">
              <p class="text-sm font-medium text-blue-800 dark:text-blue-200 mb-3">{{ pendingTransition }}</p>
              <label for="transition-date" class="block text-xs text-gray-600 dark:text-gray-400 mb-2">
                Date
                <input id="transition-date" v-model="transitionDate" type="date" class="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-base sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
              </label>
              <label for="transition-note" class="block text-xs text-gray-600 dark:text-gray-400 mb-2">
                Note — optional
                <textarea id="transition-note" v-model="transitionNote" rows="2" class="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-base sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"></textarea>
              </label>

              <!-- Dynamic metadata fields -->
              <template v-for="field in pendingTransitionMetadata" :key="field.field">
                <div v-if="field.allowMultiple" class="mb-2">
                  <span class="block text-xs text-gray-600 dark:text-gray-400 mb-1">{{ formatFieldLabel(field.field) }} — optional</span>
                  <div
                    v-for="(url, idx) in (metadataValues[field.field] as string[])"
                    :key="idx"
                    class="flex gap-2 mb-1"
                  >
                    <input
                      :id="`meta-${field.field}-${idx}`"
                      v-model="(metadataValues[field.field] as string[])[idx]"
                      type="url"
                      placeholder="https://example.com/scan.jpg"
                      class="flex-1 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-base sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                    <button
                      type="button"
                      @click="removeMetadataUrl(field.field, idx)"
                      class="px-2 py-1 text-sm text-red-600 dark:text-red-400 hover:underline min-h-[44px]"
                      aria-label="Remove URL"
                    >&times;</button>
                  </div>
                  <button
                    type="button"
                    @click="addMetadataUrl(field.field)"
                    class="text-xs text-primary-600 dark:text-primary-400 hover:underline min-h-[44px]"
                  >+ Add URL</button>
                </div>
                <label v-else :for="`meta-${field.field}`" class="block text-xs text-gray-600 dark:text-gray-400 mb-2">
                  {{ formatFieldLabel(field.field) }} — optional
                  <input
                    :id="`meta-${field.field}`"
                    v-model="metadataValues[field.field] as string"
                    :type="field.fieldType === 'number' ? 'number' : field.fieldType === 'date' ? 'date' : 'text'"
                    class="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-base sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </label>
              </template>

              <div class="flex flex-col sm:flex-row gap-2 mt-3">
                <button
                  @click="confirmTransition"
                  :disabled="transitionSubmitting"
                  class="w-full sm:w-auto px-4 py-2 sm:px-3 sm:py-2 min-h-[44px] text-sm font-medium bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
                >Confirm</button>
                <button
                  @click="cancelTransition"
                  :disabled="transitionSubmitting"
                  class="w-full sm:w-auto px-4 py-2 sm:px-3 sm:py-2 min-h-[44px] text-sm font-medium text-gray-500 dark:text-gray-400 hover:underline disabled:opacity-50"
                >Cancel</button>
              </div>
            </div>

            <div v-if="transitionError" role="alert" class="text-sm text-red-600 dark:text-red-400">{{ transitionError }}</div>
          </div>
        </div>

        <!-- Child films card (bulk only) -->
        <div v-if="isBulkFilm" class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Child Films</h2>
            <span class="text-xs text-gray-600 dark:text-gray-400">{{ childFilms.length }} film{{ childFilms.length !== 1 ? 's' : '' }} cut</span>
          </div>
          <div v-if="childFilms.length === 0" class="text-sm text-gray-600 dark:text-gray-400 italic">No films cut from this canister yet.</div>
          <ul v-else class="space-y-2">
            <li v-for="child in childFilms" :key="child.id" class="flex items-center justify-between text-sm">
              <button
                @click="router.push({ name: 'film-detail', params: { key: child.id } })"
                class="inline-flex items-center min-h-[44px] px-1 text-primary-600 dark:text-primary-400 hover:underline font-medium"
              >{{ child.name }}</button>
              <span
                class="px-2 text-xs leading-5 font-semibold rounded-full"
                :class="getStateColor(getChildStateName(child))"
              >{{ getChildStateName(child) || 'No state' }}</span>
            </li>
          </ul>
        </div>

        <!-- Tags card -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Tags</h2>
          <div class="flex flex-wrap gap-2 mb-3">
            <span
              v-for="ft in filmTags"
              :key="ft.id"
              class="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-white"
              :style="{ backgroundColor: tagById[ft.tagId]?.colorCode ?? '#888' }"
            >
              {{ tagById[ft.tagId]?.name ?? '…' }}
              <button
                @click="removeTag(ft.id)"
                class="ml-1 inline-flex items-center justify-center min-h-[44px] min-w-[44px] hover:opacity-70 font-bold"
              >&times;</button>
            </span>
            <span v-if="filmTags.length === 0" class="text-sm text-gray-600 dark:text-gray-400 italic">No tags yet</span>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="tag in availableTags"
              :key="tag.id"
              type="button"
              @click="addTag(tag)"
              class="px-3 py-2 min-h-[44px] rounded text-xs font-medium text-white opacity-40 hover:opacity-100 transition-opacity"
              :style="{ backgroundColor: tag.colorCode }"
            >{{ tag.name }}</button>
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">Click to add a tag</p>
        </div>
      </div>

      <!-- Right: State History -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 h-fit">
        <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">History</h2>
        <div v-if="sortedStates.length === 0" class="text-sm text-gray-600 dark:text-gray-400 py-4 text-center">No history recorded yet.</div>
        <ol v-else class="relative border-l border-gray-200 dark:border-gray-700 ml-3 space-y-6">
          <li v-for="(entry, idx) in sortedStates" :key="entry.id" class="ml-4">
            <div
              class="absolute -left-1.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800"
              :class="idx === sortedStates.length - 1 ? 'bg-gray-400' : isBackwardTransition(sortedStates[idx + 1]?.state?.name ?? '', entry.state?.name ?? '') ? 'bg-orange-400' : 'bg-primary-500'"
            ></div>
            <div class="flex items-center gap-2 flex-wrap">
              <span
                class="px-2 text-xs leading-5 font-semibold rounded-full"
                :class="getStateColor(entry.state?.name ?? '')"
              >{{ entry.state?.name ?? entry.stateId }}</span>
              <span v-if="idx === sortedStates.length - 1" class="text-xs text-gray-600 dark:text-gray-400">initial</span>
              <time class="text-xs text-gray-600 dark:text-gray-400">{{ formatDate(entry.date) }}</time>
            </div>
            <p v-if="entry.note" class="mt-1 text-sm text-gray-600 dark:text-gray-400">{{ entry.note }}</p>
            <!-- Metadata values -->
            <ul v-if="entry.metadata?.length" class="mt-1 space-y-0.5">
              <li
                v-for="m in entry.metadata"
                :key="m.id"
                class="text-xs text-gray-500 dark:text-gray-400"
              >
                <span class="font-medium">{{ formatFieldLabel(m.transitionStateMetadata?.field?.name ?? '') }}:</span>
                <template v-if="Array.isArray(m.value)">
                  <span v-if="m.value.length === 0" class="ml-1 italic">none</span>
                  <span v-else class="ml-1 space-x-1">
                    <a
                      v-for="(url, i) in m.value"
                      :key="i"
                      :href="url"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-primary-600 dark:text-primary-400 hover:underline"
                    >Scan {{ i + 1 }}</a>
                  </span>
                </template>
                <span v-else class="ml-1">{{ m.value ?? '—' }}</span>
              </li>
            </ul>
          </li>
        </ol>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { filmApi, tagApi, transitionApi } from '@/services/api-client'
import type { Film, FilmTag, Tag, TransitionGraph, TransitionProfile, TransitionMetadataField } from '@/types'
import { currentStateName } from '@/types'
import { useNotificationStore } from '@/stores/notification'
import { getStateColor } from '@/utils/stateColors'

const route = useRoute()
const router = useRouter()
const notification = useNotificationStore()

const film = ref<Film | null>(null)
const parentFilm = ref<Film | null>(null)
const childFilms = ref<Film[]>([])
const filmTags = ref<FilmTag[]>([])
const allTags = ref<Tag[]>([])
const transitionProfiles = ref<TransitionProfile[]>([])
const loading = ref(true)
const transitionError = ref('')
const transitionSubmitting = ref(false)
const pendingTransition = ref<string | null>(null)
const pendingTransitionMetadata = ref<TransitionMetadataField[]>([])
const transitionDate = ref('')
const transitionNote = ref('')
const metadataValues = ref<Record<string, string | string[]>>({})

const transitionGraph = ref<TransitionGraph>({ states: [], transitions: [] })

const stateName = computed(() => film.value ? currentStateName(film.value) : '')

const getChildStateName = (child: Film): string => currentStateName(child)

const isBulkFilm = computed(() => {
  const bulkProfile = transitionProfiles.value.find(p => p.name === 'bulk')
  return !!bulkProfile && film.value?.transitionProfileId === bulkProfile.id
})

const isBackwardTransition = (from: string, to: string): boolean =>
  transitionGraph.value.transitions.some(
    t => t.fromState === from && t.toState === to,
  ) === false && !!from && !!to &&
  transitionGraph.value.transitions.some(t => t.toState === from && t.fromState === to)

const validTransitions = computed(() =>
  film.value
    ? transitionGraph.value.transitions
        .filter(t => t.fromState === stateName.value)
        .map(t => t.toState)
    : []
)

const tagById = computed(() => {
  const map: Record<string, Tag> = {}
  for (const t of allTags.value) map[t.id] = t
  return map
})

const availableTags = computed(() => {
  const assignedIds = new Set(filmTags.value.map(ft => ft.tagId))
  return allTags.value.filter(t => !assignedIds.has(t.id))
})

const sortedStates = computed(() => {
  if (!film.value?.states) return []
  return [...film.value.states].sort((a, b) => b.id - a.id)
})

const formatDate = (date: Date | string) => new Date(date as string).toLocaleDateString()

const formatFieldLabel = (fieldName: string): string =>
  fieldName.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim()

const handleTransition = (targetState: string) => {
  pendingTransition.value = targetState
  transitionDate.value = new Date().toISOString().slice(0, 10)
  transitionNote.value = ''

  const edge = transitionGraph.value.transitions.find(
    t => t.fromState === stateName.value && t.toState === targetState,
  )
  pendingTransitionMetadata.value = edge?.metadata ?? []

  const initialValues: Record<string, string | string[]> = {}
  for (const field of pendingTransitionMetadata.value) {
    initialValues[field.field] = field.allowMultiple ? [] : ''
  }
  metadataValues.value = initialValues
}

const cancelTransition = () => {
  pendingTransition.value = null
  pendingTransitionMetadata.value = []
  metadataValues.value = {}
}

const addMetadataUrl = (fieldName: string) => {
  const arr = metadataValues.value[fieldName]
  if (Array.isArray(arr)) arr.push('')
}

const removeMetadataUrl = (fieldName: string, idx: number) => {
  const arr = metadataValues.value[fieldName]
  if (Array.isArray(arr)) arr.splice(idx, 1)
}

const buildMetadataPayload = (): Record<string, string | string[]> | undefined => {
  const payload: Record<string, string | string[]> = {}
  for (const field of pendingTransitionMetadata.value) {
    const val = metadataValues.value[field.field]
    if (field.allowMultiple) {
      const urls = (val as string[]).filter(u => u.trim() !== '')
      if (urls.length > 0) payload[field.field] = urls
    } else {
      const scalar = String(val ?? '').trim()
      if (scalar !== '') payload[field.field] = scalar
    }
  }
  return Object.keys(payload).length > 0 ? payload : undefined
}

const confirmTransition = async () => {
  if (!film.value || !pendingTransition.value) return
  transitionSubmitting.value = true
  transitionError.value = ''
  const targetStateName = pendingTransition.value
  try {
    const today = new Date().toISOString().slice(0, 10)
    const dateStr = transitionDate.value && transitionDate.value !== today
      ? new Date(transitionDate.value + 'T12:00:00').toISOString()
      : new Date().toISOString()
    const metadata = buildMetadataPayload()
    await filmApi.transition(film.value.id, targetStateName, dateStr, transitionNote.value || undefined, metadata)
    cancelTransition()
    await loadData()
    notification.announce(`Film moved to ${targetStateName}`)
  } catch (err) {
    console.error('Transition failed:', err)
    transitionError.value = 'Failed to transition film. Please try again.'
  } finally {
    transitionSubmitting.value = false
  }
}

const addTag = async (tag: Tag) => {
  if (!film.value) return
  try {
    await filmApi.addTag(film.value.id, tag.id)
    film.value = (await filmApi.getById(film.value.id)).data
    await loadFilmTags()
  } catch (err) {
    console.error('Error adding tag:', err)
  }
}

const removeTag = async (tagId: number) => {
  if (!film.value) return
  try {
    await filmApi.removeTag(film.value.id, tagId)
    film.value = (await filmApi.getById(film.value.id)).data
    await loadFilmTags()
  } catch (err) {
    console.error('Error removing tag:', err)
  }
}

const loadFilmTags = async () => {
  if (!film.value) return
  filmTags.value = (film.value.tags ?? []).map(ft => ({
    id: ft.id,
    filmId: film.value!.id,
    tagId: ft.id,
  }))
}

const loadData = async () => {
  const id = Number(route.params.key)
  const [filmRes, tagsRes] = await Promise.all([
    filmApi.getById(id),
    tagApi.getAll(),
  ])
  film.value = filmRes.data
  allTags.value = tagsRes.data

  await Promise.all([
    loadFilmTags(),
    film.value?.parentId
      ? filmApi.getById(film.value.parentId).then(r => { parentFilm.value = r.data })
      : Promise.resolve().then(() => { parentFilm.value = null }),
    isBulkFilm.value
      ? filmApi.getChildren(Number(id)).then(r => { childFilms.value = r.data })
      : Promise.resolve().then(() => { childFilms.value = [] }),
  ])
}

const reload = async () => {
  loading.value = true
  try {
    await Promise.all([
      loadData(),
      transitionApi.getProfiles().then(r => { transitionProfiles.value = r.data }),
    ])
    const profileName = transitionProfiles.value.find(p => p.id === film.value?.transitionProfileId)?.name ?? 'standard'
    const graphRes = await transitionApi.getGraph(profileName)
    transitionGraph.value = graphRes.data
  } finally {
    loading.value = false
  }
}

onMounted(reload)
watch(() => route.params.key, reload)
</script>
