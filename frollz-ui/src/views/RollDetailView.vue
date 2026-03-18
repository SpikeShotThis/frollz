<template>
  <div>
    <div class="mb-6">
      <button
        @click="$router.push({ name: 'rolls' })"
        class="text-sm text-primary-600 dark:text-primary-400 hover:underline"
      >← Back to Rolls</button>
    </div>

    <div v-if="loading" class="text-center py-12 text-gray-400 dark:text-gray-500">Loading...</div>

    <div v-else-if="!roll" class="text-center py-12 text-gray-400 dark:text-gray-500">Roll not found.</div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Left: Details + Tags + Transitions -->
      <div class="space-y-6">
        <!-- Roll header -->
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">{{ roll.rollId }}</h1>
          <span
            class="mt-2 inline-block px-2 text-xs leading-5 font-semibold rounded-full"
            :class="getStateColor(roll.state)"
          >{{ roll.state }}</span>
        </div>

        <!-- Details card -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Details</h2>
          <dl class="space-y-3">
            <div class="flex justify-between text-sm">
              <dt class="text-gray-500 dark:text-gray-400">Date Obtained</dt>
              <dd class="text-gray-900 dark:text-gray-100">{{ formatDate(roll.dateObtained) }}</dd>
            </div>
            <div class="flex justify-between text-sm">
              <dt class="text-gray-500 dark:text-gray-400">Obtained From</dt>
              <dd class="text-gray-900 dark:text-gray-100">{{ roll.obtainedFrom }}</dd>
            </div>
            <div class="flex justify-between text-sm">
              <dt class="text-gray-500 dark:text-gray-400">Method</dt>
              <dd class="text-gray-900 dark:text-gray-100">{{ roll.obtainmentMethod }}</dd>
            </div>
            <div v-if="roll.expirationDate" class="flex justify-between text-sm">
              <dt class="text-gray-500 dark:text-gray-400">Expiration Date</dt>
              <dd class="text-gray-900 dark:text-gray-100">{{ formatDate(roll.expirationDate) }}</dd>
            </div>
            <div class="flex justify-between text-sm">
              <dt class="text-gray-500 dark:text-gray-400">X-Ray Exposures</dt>
              <dd class="text-gray-900 dark:text-gray-100">{{ roll.timesExposedToXrays }}</dd>
            </div>
            <div v-if="roll.loadedInto" class="flex justify-between text-sm">
              <dt class="text-gray-500 dark:text-gray-400">Loaded Into</dt>
              <dd class="text-gray-900 dark:text-gray-100">{{ roll.loadedInto }}</dd>
            </div>
            <div v-if="roll.imagesUrl" class="flex justify-between text-sm">
              <dt class="text-gray-500 dark:text-gray-400">Images</dt>
              <dd><a :href="roll.imagesUrl" target="_blank" class="text-primary-600 dark:text-primary-400 hover:underline text-sm">View Album</a></dd>
            </div>
          </dl>
        </div>

        <!-- Transitions card -->
        <div v-if="validTransitions.length > 0" class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Transitions</h2>
          <div class="space-y-3">
            <div class="flex flex-wrap gap-2">
              <button
                v-for="targetState in validTransitions"
                :key="targetState"
                @click="handleTransition(targetState)"
                :disabled="transitionSubmitting"
                class="px-3 py-1 text-xs font-medium border rounded disabled:opacity-50"
                :class="isBackwardTransition(roll.state, targetState)
                  ? 'text-orange-700 border-orange-400 hover:bg-orange-50 dark:text-orange-400 dark:border-orange-500 dark:hover:bg-orange-900/30'
                  : 'bg-primary-600 text-white border-primary-600 hover:bg-primary-700 dark:bg-primary-700 dark:border-primary-700 dark:hover:bg-primary-800'"
              >
                {{ isBackwardTransition(roll.state, targetState) ? '↩ ' : '' }}{{ targetState }}
              </button>
            </div>
            <div>
              <textarea
                v-model="transitionNotes"
                rows="2"
                placeholder="Notes for this transition (optional)..."
                class="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              ></textarea>
            </div>
            <div v-if="transitionError" class="text-sm text-red-600 dark:text-red-400">{{ transitionError }}</div>
          </div>
        </div>

        <!-- Tags card -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Tags</h2>
          <div class="flex flex-wrap gap-2 mb-3">
            <span
              v-for="rt in rollTags"
              :key="rt._key"
              class="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-white"
              :style="{ backgroundColor: tagByKey[rt.tagKey]?.color ?? '#888' }"
            >
              {{ tagByKey[rt.tagKey]?.value ?? '…' }}
              <button
                @click="removeTag(rt._key!)"
                class="ml-1 leading-none hover:opacity-70 font-bold"
              >&times;</button>
            </span>
            <span v-if="rollTags.length === 0" class="text-sm text-gray-400 dark:text-gray-500 italic">No tags yet</span>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="tag in availableTags"
              :key="tag._key"
              type="button"
              @click="addTag(tag)"
              class="px-2 py-1 rounded text-xs font-medium text-white opacity-40 hover:opacity-100 transition-opacity"
              :style="{ backgroundColor: tag.color }"
            >{{ tag.value }}</button>
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">Click to add a tag</p>
        </div>
      </div>

      <!-- Right: Transition History -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 h-fit">
        <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">History</h2>
        <div v-if="annotatedHistory.length === 0" class="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">No history recorded yet.</div>
        <ol v-else class="relative border-l border-gray-200 dark:border-gray-700 ml-3 space-y-6">
          <li v-for="entry in annotatedHistory" :key="entry.stateId" class="ml-4">
            <div
              class="absolute -left-1.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800"
              :class="entry.direction === 'backward' ? 'bg-orange-400' : entry.direction === 'initial' ? 'bg-gray-400' : 'bg-primary-500'"
            ></div>
            <div class="flex items-center gap-2 flex-wrap">
              <span
                class="px-2 text-xs leading-5 font-semibold rounded-full"
                :class="getStateColor(entry.state)"
              >{{ entry.state }}</span>
              <span v-if="entry.direction === 'backward'" class="text-xs text-orange-600 dark:text-orange-400">↩ correction</span>
              <span v-if="entry.direction === 'initial'" class="text-xs text-gray-400 dark:text-gray-500">initial</span>
              <time class="text-xs text-gray-400 dark:text-gray-500">{{ formatDateTime(entry.date) }}</time>
            </div>
            <p v-if="entry.notes" class="mt-1 text-sm text-gray-600 dark:text-gray-400">{{ entry.notes }}</p>
          </li>
        </ol>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { rollApi, rollStateApi, rollTagApi, tagApi } from '@/services/api-client'
import type { Roll, RollStateHistory, Tag, RollTag } from '@/types'
import { RollState } from '@/types'

const route = useRoute()

const roll = ref<Roll | null>(null)
const history = ref<RollStateHistory[]>([])
const rollTags = ref<RollTag[]>([])
const allTags = ref<Tag[]>([])
const loading = ref(true)
const transitionNotes = ref('')
const transitionError = ref('')
const transitionSubmitting = ref(false)

const FORWARD_TRANSITIONS: Partial<Record<RollState, RollState[]>> = {
  [RollState.ADDED]: [RollState.FROZEN, RollState.REFRIGERATED, RollState.SHELVED],
  [RollState.FROZEN]: [RollState.REFRIGERATED, RollState.SHELVED],
  [RollState.REFRIGERATED]: [RollState.SHELVED],
  [RollState.SHELVED]: [RollState.LOADED],
  [RollState.LOADED]: [RollState.FINISHED],
  [RollState.FINISHED]: [RollState.SENT_FOR_DEVELOPMENT],
  [RollState.SENT_FOR_DEVELOPMENT]: [RollState.DEVELOPED],
  [RollState.DEVELOPED]: [RollState.RECEIVED],
}

const BACKWARD_TRANSITIONS: Partial<Record<RollState, RollState[]>> = {
  [RollState.FROZEN]: [RollState.ADDED],
  [RollState.REFRIGERATED]: [RollState.FROZEN, RollState.ADDED],
  [RollState.SHELVED]: [RollState.REFRIGERATED, RollState.FROZEN],
  [RollState.LOADED]: [RollState.SHELVED, RollState.REFRIGERATED, RollState.FROZEN],
  [RollState.FINISHED]: [RollState.LOADED],
  [RollState.SENT_FOR_DEVELOPMENT]: [RollState.FINISHED],
  [RollState.DEVELOPED]: [RollState.SENT_FOR_DEVELOPMENT],
  [RollState.RECEIVED]: [RollState.DEVELOPED],
}

const VALID_TRANSITIONS: Partial<Record<RollState, RollState[]>> = Object.fromEntries(
  Object.values(RollState).map((state) => [
    state,
    [
      ...(FORWARD_TRANSITIONS[state] ?? []),
      ...(BACKWARD_TRANSITIONS[state] ?? []),
    ],
  ]),
) as Partial<Record<RollState, RollState[]>>

const isBackwardTransition = (from: RollState, to: RollState): boolean =>
  (BACKWARD_TRANSITIONS[from] ?? []).includes(to)

const validTransitions = computed(() =>
  roll.value ? (VALID_TRANSITIONS[roll.value.state] ?? []) : [],
)

const tagByKey = computed(() => {
  const map: Record<string, Tag> = {}
  for (const t of allTags.value) {
    if (t._key) map[t._key] = t
  }
  return map
})

const availableTags = computed(() => {
  const assignedKeys = new Set(rollTags.value.map(rt => rt.tagKey))
  return allTags.value.filter(t => t.isRollScoped && !assignedKeys.has(t._key!))
})

type AnnotatedEntry = RollStateHistory & { direction: 'forward' | 'backward' | 'initial' }

const annotatedHistory = computed((): AnnotatedEntry[] => {
  const sorted = history.value.slice().sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  )
  return sorted
    .map((entry, idx): AnnotatedEntry => {
      if (idx === 0) return { ...entry, direction: 'initial' }
      const prev = sorted[idx - 1]
      const direction = isBackwardTransition(prev.state, entry.state) ? 'backward' : 'forward'
      return { ...entry, direction }
    })
    .reverse()
})

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

const formatDate = (date: Date | string) => new Date(date as string).toLocaleDateString()
const formatDateTime = (date: Date | string) => new Date(date as string).toLocaleString()

const handleTransition = async (targetState: RollState) => {
  if (!roll.value) return
  transitionSubmitting.value = true
  transitionError.value = ''
  try {
    await rollApi.transition(roll.value._key!, targetState, transitionNotes.value || undefined)
    transitionNotes.value = ''
    await loadData()
  } catch {
    transitionError.value = 'Failed to transition roll. Please try again.'
  } finally {
    transitionSubmitting.value = false
  }
}

const addTag = async (tag: Tag) => {
  if (!roll.value) return
  try {
    await rollTagApi.create({ rollKey: roll.value._key!, tagKey: tag._key! })
    await loadRollTags()
  } catch (err) {
    console.error('Error adding tag:', err)
  }
}

const removeTag = async (rollTagKey: string) => {
  try {
    await rollTagApi.delete(rollTagKey)
    await loadRollTags()
  } catch (err) {
    console.error('Error removing tag:', err)
  }
}

const loadRollTags = async () => {
  if (!roll.value) return
  const response = await rollTagApi.getAll({ rollKey: roll.value._key })
  rollTags.value = response.data
}

const loadData = async () => {
  const key = route.params.key as string
  const [rollRes, historyRes, tagsRes] = await Promise.all([
    rollApi.getById(key),
    rollStateApi.getHistory(key),
    tagApi.getAll(),
  ])
  roll.value = rollRes.data
  history.value = historyRes.data
  allTags.value = tagsRes.data
  await loadRollTags()
}

onMounted(async () => {
  try {
    await loadData()
  } finally {
    loading.value = false
  }
})
</script>
